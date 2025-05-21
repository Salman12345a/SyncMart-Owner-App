package com.dkbranch.socket

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.dkbranch.socket.data.AppDatabase
import com.dkbranch.socket.data.OrderEntity
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class OrderSocketManager(private val database: AppDatabase? = null) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private val orderChannel = Channel<JSONObject>(Channel.BUFFERED)
    
    private var isConnected = false
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 5
    private var currentBranchId: String? = null
    
    private var eventEmitter: ((String, WritableMap) -> Unit)? = null
    private var currentToken: String? = null

    fun setEventEmitter(emitter: (String, WritableMap) -> Unit) {
        eventEmitter = emitter
    }

    fun setToken(token: String) {
        currentToken = token
    }

    fun connect(branchId: String) {
        if (webSocket != null) {
            Log.d(TAG, "Socket already exists, cleaning up before reconnection")
            disconnect()
        }

        currentBranchId = branchId
        val socketUrl = "http://10.0.2.2:3000" // Android emulator localhost
        
        try {
            val request = Request.Builder()
                .url(socketUrl)
                .addHeader("Authorization", "Bearer $currentToken")
                .build()

            Log.d(TAG, "Attempting connection to: $socketUrl")
            
            webSocket = client.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    Log.d(TAG, "Socket Connected Successfully")
                    isConnected = true
                    reconnectAttempts = 0
                    
                    try {
                        // Join branch room
                        val joinData = JSONObject().apply {
                            put("event", "joinBranch")
                            put("branchId", branchId)
                        }
                        webSocket.send(joinData.toString())
                        Log.d(TAG, "Join branch message sent for: $branchId")

                        // Join existing order rooms from database
                        scope.launch {
                            database?.orderDao()?.getOrdersForBranch(branchId)?.collect { orders ->
                                orders.forEach { order ->
                                    val joinRoomData = JSONObject().apply {
                                        put("event", "joinRoom")
                                        put("roomId", order.orderId)
                                    }
                                    webSocket.send(joinRoomData.toString())
                                    Log.d(TAG, "Joined existing order room: ${order.orderId}")
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in onOpen: ${e.message}")
                    }
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    Log.d(TAG, "Received message: $text")
                    scope.launch {
                        try {
                            val json = JSONObject(text)
                            when (json.getString("event")) {
                                "newOrder" -> handleNewOrder(json.getJSONObject("data"))
                                "orderStatusUpdate" -> handleOrderUpdate(json.getJSONObject("data"))
                                "walletUpdated" -> handleWalletUpdate(json.getJSONObject("data"))
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error processing message: ${e.message}")
                        }
                    }
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.d(TAG, "Socket Closed: $code - $reason")
                    isConnected = false
                    handleReconnection(branchId)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "Socket Failure: ${t.message}")
                    isConnected = false
                    handleReconnection(branchId)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error creating socket connection: ${e.message}")
            throw e
        }
    }

    private fun handleReconnection(branchId: String) {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            scope.launch {
                delay(reconnectAttempts * 1000L)
                connect(branchId)
            }
        }
    }

    private suspend fun handleNewOrder(orderData: JSONObject) {
        try {
            // Store in database
            database?.orderDao()?.insertOrder(
                OrderEntity(
                    orderId = orderData.getString("_id"),
                    branchId = orderData.getString("branchId"),
                    orderData = orderData.toString(),
                    status = orderData.getString("status")
                )
            )

            // Join order room
            val joinRoomData = JSONObject().apply {
                put("event", "joinRoom")
                put("roomId", orderData.getString("_id"))
            }
            webSocket?.send(joinRoomData.toString())
            
            // Emit to React Native
            emitOrderEvent("newOrder", orderData)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling new order: ${e.message}")
        }
    }

    private suspend fun handleOrderUpdate(orderData: JSONObject) {
        try {
            // Update in database
            database?.orderDao()?.updateOrder(
                OrderEntity(
                    orderId = orderData.getString("_id"),
                    branchId = orderData.getString("branchId"),
                    orderData = orderData.toString(),
                    status = orderData.getString("status")
                )
            )
            
            // Emit to React Native
            emitOrderEvent("orderUpdate", orderData)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling order update: ${e.message}")
        }
    }

    private fun handleWalletUpdate(data: JSONObject) {
        try {
            val params = Arguments.createMap().apply {
                putString("branchId", data.getString("branchId"))
                putDouble("newBalance", data.getDouble("newBalance"))
                putString("transaction", data.getJSONObject("transaction").toString())
            }
            eventEmitter?.invoke("walletUpdated", params)
        } catch (e: Exception) {
            Log.e(TAG, "Error handling wallet update: ${e.message}")
        }
    }

    private fun emitOrderEvent(eventName: String, orderData: JSONObject) {
        eventEmitter?.let { emit ->
            val params = Arguments.createMap().apply {
                putString("orderId", orderData.getString("_id"))
                putString("status", orderData.getString("status"))
                putString("orderData", orderData.toString())
            }
            emit(eventName, params)
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
        webSocket?.close(1000, "Normal closure")
        webSocket = null
        isConnected = false
        scope.cancel()
        currentBranchId = null
    }

    companion object {
        private const val TAG = "OrderSocketManager"
    }
} 