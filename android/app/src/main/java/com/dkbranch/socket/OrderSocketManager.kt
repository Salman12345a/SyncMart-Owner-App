package com.dkbranch.socket

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.dkbranch.socket.data.AppDatabase
import com.dkbranch.socket.data.OrderEntity
import com.dkbranch.socket.data.EncryptedSharedPreferencesManager
import com.facebook.react.bridge.WritableArray
import org.json.JSONArray
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class OrderSocketManager(private val database: AppDatabase, private val encryptedPrefsManager: EncryptedSharedPreferencesManager) {
    private var webSocket: WebSocket? = null
    private lateinit var context: Context
    private var wakeLock: PowerManager.WakeLock? = null
    private val WAKE_LOCK_TAG = "OrderSocketManager::WakeLock"
    
    // Improved OkHttp client with better timeout and keep-alive settings
    // JSON to WritableMap/Array helpers (consider moving to a utility class)
    private fun convertJsonToMap(jsonObject: JSONObject): WritableMap {
        val map = Arguments.createMap()
        jsonObject.keys().forEach { key ->
            when (val value = jsonObject.get(key)) {
                is JSONObject -> map.putMap(key, convertJsonToMap(value))
                is JSONArray -> map.putArray(key, convertJsonToArray(value))
                is Boolean -> map.putBoolean(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble()) // WritableMap no putLong
                is Double -> map.putDouble(key, value)
                is String -> map.putString(key, value)
                else -> map.putNull(key)
            }
        }
        return map
    }

    private fun convertJsonToArray(jsonArray: JSONArray): WritableArray {
        val array = Arguments.createArray()
        for (i in 0 until jsonArray.length()) {
            when (val value = jsonArray.get(i)) {
                is JSONObject -> array.pushMap(convertJsonToMap(value))
                is JSONArray -> array.pushArray(convertJsonToArray(value))
                is Boolean -> array.pushBoolean(value)
                is Int -> array.pushInt(value)
                is Long -> array.pushDouble(value.toDouble()) // WritableArray no pushLong
                is Double -> array.pushDouble(value)
                is String -> array.pushString(value)
                else -> array.pushNull()
            }
        }
        return array
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)  // No timeout for WebSocket
        .writeTimeout(30, TimeUnit.SECONDS)     // Reasonable write timeout
        .connectTimeout(15, TimeUnit.SECONDS)   // Connection timeout
        .pingInterval(15, TimeUnit.SECONDS)     // More frequent pings for keep-alive
        .retryOnConnectionFailure(true)         // Auto retry connections
        .build()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob()) // SupervisorJob for better error handling
    private val orderChannel = Channel<JSONObject>(Channel.BUFFERED)
    
    private var isConnected = false
    private var isConnecting = false
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 30 // Increased max reconnect attempts
    private var currentBranchId: String? = null
    private var connectionJob: Job? = null
    
    private var eventEmitter: ((String, WritableMap) -> Unit)? = null
    private var currentToken: String? = null
    
    // Socket server URL - should be configured from the React Native side
    private var socketServerUrl = "https://dokirana.el.r.appspot.com/" // Default socket URL
    
    // API base URL for REST requests - configured from React Native side
    private var apiBaseUrl = "https://dokirana.el.r.appspot.com/api" // Default API URL

    fun setContext(context: Context) {
        this.context = context.applicationContext // Use application context
    }
    
    fun setEventEmitter(emitter: (String, WritableMap) -> Unit) {
        eventEmitter = emitter
    }

    fun setToken(token: String) {
        currentToken = token
    }
    
    fun setSocketServerUrl(url: String) {
        socketServerUrl = url
        Log.d(TAG, "Socket server URL set to: $url")
    }
    
    fun setApiBaseUrl(url: String) {
        this.apiBaseUrl = url
    }
    
    fun getApiBaseUrl(): String {
        return apiBaseUrl
    }

    fun isConnected(): Boolean {
        return isConnected
    }
    
    private fun acquireWakeLock() {
        Log.d(TAG, "Attempting to acquire WakeLock...")
        try {
            context?.let { ctx ->
                if (wakeLock == null) {
                    val powerManager = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
                    wakeLock = powerManager.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "DKBranch:OrderSocketWakeLock"
                    )
                    wakeLock?.setReferenceCounted(false)
                }
                
                if (wakeLock?.isHeld == false) {
                    wakeLock?.acquire(30 * 60 * 1000L) // 30 minutes max
                    Log.d(TAG, "WakeLock acquired")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error acquiring WakeLock: ${e.message}", e)
        }
    }
    
    private fun releaseWakeLock() {
        Log.d(TAG, "Attempting to release WakeLock...")
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "WakeLock released")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing WakeLock: ${e.message}", e)
        }
    }
    
    private fun isNetworkAvailable(): Boolean {
        context?.let { ctx ->
            val connectivityManager = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork ?: return false
                val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
                return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                val networkInfo = connectivityManager.activeNetworkInfo
                @Suppress("DEPRECATION")
                return networkInfo != null && networkInfo.isConnected
            }
        }
        return false
    }

    fun connect(branchId: String, token: String) {
        Log.i(TAG, "connect() called with branchId: $branchId, token: ${token.take(10)}...")
        if (!::context.isInitialized) {
            Log.e(TAG, "Context not set. Call setContext() before connecting.")
            eventEmitter?.invoke("error", Arguments.createMap().apply { putString("message", "Context not set in OrderSocketManager") })
            return
        }

        // Check store status before connecting
        if (!encryptedPrefsManager.getStoreStatus(context)) {
            Log.i(TAG, "Store is closed. Socket connection not initiated.")
            eventEmitter?.invoke("error", Arguments.createMap().apply { putString("message", "Store is closed. Cannot connect socket.") })
            return
        }

        if (isConnected || isConnecting) {
            Log.d(TAG, "Already connected or connecting.")
            return
        }
        
        // Clean up existing connection if any
        if (webSocket != null) {
            Log.d(TAG, "Socket already exists, cleaning up before reconnection")
            webSocket?.close(1000, "Reconnecting")
            webSocket = null
        }
        
        // Cancel any existing reconnection job
        connectionJob?.cancel()
        
        // Acquire wake lock to keep CPU active for socket connection
        acquireWakeLock()
        
        // Start connection in background thread
        connectionJob = scope.launch {
            try {
                isConnecting = true
                Log.d(TAG, "Starting new socket connection")
                
                // Check network availability first
                if (!isNetworkAvailable()) {
                    Log.d(TAG, "Network unavailable, scheduling retry")
                    delay(5000) // Wait 5 seconds before retry
                    isConnecting = false
                    handleReconnection(branchId)
                    return@launch
                }
                
                val request = Request.Builder()
                    .url(socketServerUrl)
                    .addHeader("Authorization", "Bearer $token")
                    .build()

                Log.i(TAG, "Attempting to connect to: $socketServerUrl")
                
                webSocket = client.newWebSocket(request, object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        Log.i(TAG, "WebSocket connection opened. Response: ${response.message}")
                        Log.d(TAG, "Socket Connected Successfully")
                        isConnected = true
                        isConnecting = false
                        reconnectAttempts = 0
                        
                        // Send keep-alive ping immediately
                        sendKeepAlivePing()
                        
                        try {
                            // Join branch room
                            val joinData = JSONObject().apply {
                                put("event", "joinBranch")
                                put("branchId", branchId)
                                put("token", token) // Include token for auth
                            }
                            webSocket.send(joinData.toString())
                            Log.d(TAG, "Join branch message sent for: $branchId")

                            // Join existing order rooms from database
                            scope.launch {
                                try {
                                    database.orderDao().getOrdersForBranch(branchId).collect { orders ->
                                        orders.forEach { order ->
                                            val joinRoomData = JSONObject().apply {
                                                put("event", "joinRoom")
                                                put("roomId", order.orderId)
                                            }
                                            webSocket.send(joinRoomData.toString())
                                            Log.d(TAG, "Joined existing order room: ${order.orderId}")
                                        }
                                    }
                                } catch (e: Exception) {
                                    Log.e(TAG, "Error joining order rooms: ${e.message}")
                                }
                            }
                            
                            // Start heartbeat mechanism
                            startHeartbeat()
                            
                        } catch (e: Exception) {
                            Log.e(TAG, "Error in onOpen: ${e.message}")
                        }
                    }

                    override fun onMessage(webSocket: WebSocket, text: String) {
                        Log.d(TAG, "WebSocket message received (raw): $text")
                        Log.d(TAG, "Receiving: $text")
                        try {
                            val messageJson = JSONObject(text)
                            val event = messageJson.optString("event")
                            val dataObject = messageJson.optJSONObject("data") ?: messageJson // Fallback if data is not nested

                            if (event == "newOrder" || event == "orderUpdate") {
                                scope.launch {
                                    try {
                                        val orderId = dataObject.optString("orderId", dataObject.optString("_id"))
                                        val currentBranchId = getBranchIdFromToken()
                                        val status = dataObject.optString("status", "Pending")

                                        if (orderId.isNotEmpty() && currentBranchId != null) {
                                            val orderEntity = OrderEntity(
                                                orderId = orderId,
                                                branchId = currentBranchId,
                                                orderData = dataObject.toString(),
                                                status = status,
                                                createdAt = dataObject.optLong("createdAt", System.currentTimeMillis()),
                                                updatedAt = dataObject.optLong("updatedAt", System.currentTimeMillis())
                                            )
                                            // insertOrder will update if orderId (PrimaryKey) exists
                                            database.orderDao().insertOrder(orderEntity)
                                            Log.i(TAG, "Order $orderId processed and saved/updated in database.")

                                            if (event == "newOrder") {
                                                // Join room for the new order
                                                val joinRoomData = JSONObject().apply {
                                                    put("event", "joinRoom")
                                                    put("roomId", orderId)
                                                }
                                                this@OrderSocketManager.webSocket?.send(joinRoomData.toString())
                                                Log.i(TAG, "Sent joinRoom for new order $orderId")
                                            }

                                            // Emit event to service/RN after saving/updating and joining room
                                            val params = Arguments.createMap()
                                            dataObject.keys()?.forEach {
                                                when (val value = dataObject.get(it)) {
                                                    is String -> params.putString(it, value)
                                                    is Int -> params.putInt(it, value)
                                                    is Boolean -> params.putBoolean(it, value)
                                                    is Double -> params.putDouble(it, value)
                                                    is Long -> params.putDouble(it, value.toDouble())
                                                    is JSONObject -> params.putMap(it, convertJsonToMap(value))
                                                    is JSONArray -> params.putArray(it, convertJsonToArray(value))
                                                }
                                            }
                                            eventEmitter?.invoke(event, params)
                                        } else {
                                            Log.w(TAG, "Missing orderId or branchId in $event message. Cannot process.")
                                        }
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error processing and saving order $event: ${e.message}", e)
                                    }
                                }
                            } else {
                                // Handle other events (like joinedBranch, pong, etc.)
                                val params = Arguments.createMap()
                                dataObject?.keys()?.forEach {
                                     when (val value = dataObject.get(it)) {
                                        is String -> params.putString(it, value)
                                        is Int -> params.putInt(it, value)
                                        is Boolean -> params.putBoolean(it, value)
                                        is Double -> params.putDouble(it, value)
                                        is Long -> params.putDouble(it, value.toDouble())
                                        is JSONObject -> params.putMap(it, convertJsonToMap(value))
                                        is JSONArray -> params.putArray(it, convertJsonToArray(value))
                                    }
                                }
                                eventEmitter?.invoke(event, params)
                            }

                        } catch (e: Exception) {
                            Log.e(TAG, "Error parsing message: ${e.message}")
                        }
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        Log.w(TAG, "WebSocket connection closed. Code: $code, Reason: $reason")
                        Log.d(TAG, "Socket Closed: $code - $reason")
                        isConnected = false
                        isConnecting = false
                        handleReconnection(branchId)
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        Log.e(TAG, "WebSocket connection failure. Error: ${t.message}, Response: ${response?.message}", t)
                        Log.e(TAG, "Socket Failure: ${t.message}")
                        isConnected = false
                        isConnecting = false
                        handleReconnection(branchId)
                    }
                })
            } catch (e: Exception) {
                Log.e(TAG, "Error creating socket connection: ${e.message}")
                isConnecting = false
                handleReconnection(branchId)
            }
        }
    }
    
    // Send custom ping to keep connection alive
    // Helper to get branchId from token (assuming it's stored in token)
    private fun getBranchIdFromToken(): String? {
        // This is a placeholder. Implement actual logic to decode token if branchId is part of JWT
        // Or retrieve it from a reliable source if not in token.
        // For now, trying to get it from shared preferences as a fallback.
        return encryptedPrefsManager.getBranchId(context)
    }

    private fun sendKeepAlivePing() {
        if (isConnected && webSocket != null) {
            try {
                val pingData = JSONObject().apply {
                    put("event", "ping")
                    put("timestamp", System.currentTimeMillis())
                }
                webSocket?.send(pingData.toString())
                Log.v(TAG, "Sent keep-alive ping: $pingData")
                Log.d(TAG, "Sent keep-alive ping")
            } catch (e: Exception) {
                Log.e(TAG, "Error sending keep-alive ping: ${e.message}", e)
            }
        }
    }
    
    // Start periodic heartbeat to keep connection alive
    private fun startHeartbeat() {
        scope.launch {
            while (isActive && isConnected) {
                try {
                    sendKeepAlivePing()
                    delay(25000) // Send ping every 25 seconds
                } catch (e: Exception) {
                    Log.e(TAG, "Heartbeat error: ${e.message}")
                }
            }
        }
    }

    private fun handleReconnection(branchId: String) {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            val delayTime = minOf(reconnectAttempts * 1000L, 30000L) // Cap at 30 seconds max delay
            
            Log.d(TAG, "Scheduling reconnection attempt $reconnectAttempts after $delayTime ms")
            
            connectionJob?.cancel() // Cancel any existing job
            connectionJob = scope.launch {
                delay(delayTime)
                
                // Check if network is available before attempting reconnection
                if (isNetworkAvailable()) {
                    Log.d(TAG, "Network available, attempting reconnection")
                    currentToken?.let { token ->
                        connect(branchId, token)
                    }
                } else {
                    Log.d(TAG, "Network still unavailable, will retry later")
                    handleReconnection(branchId) // Try again later
                }
            }
        } else {
            Log.e(TAG, "Max reconnection attempts reached, giving up")
            releaseWakeLock() // Release wake lock after max attempts
        }
    }


    fun emit(event: String, data: JSONObject) {
        if (isConnected && webSocket != null) {
            try {
                webSocket?.send(data.toString())
            } catch (e: Exception) {
                Log.e(TAG, "Error emitting event: ${e.message}")
            }
        } else {
            Log.w(TAG, "Cannot emit $event - socket not connected")
        }
    }

    fun disconnect() {
        Log.d(TAG, "Disconnecting socket")
        try {
            // Cancel any pending connection/reconnection job
            connectionJob?.cancel()
            
            // Close the websocket properly
            webSocket?.close(1000, "Normal closure")
            webSocket = null
            isConnected = false
            isConnecting = false
            
            // Release wake lock
            releaseWakeLock()
            
            // Reset state
            currentBranchId = null
        } catch (e: Exception) {
            Log.e(TAG, "Error during disconnect: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "OrderSocketManager"
    }
} 