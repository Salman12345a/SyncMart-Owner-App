package com.dkbranch.socket

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.dkbranch.socket.data.AppDatabase
import com.dkbranch.socket.service.OrderSocketService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class OrderSocketModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val database = AppDatabase.getInstance(reactContext)
    private val socketManager = OrderSocketManager(database)
    private val scope = CoroutineScope(Dispatchers.IO)

    init {
        socketManager.setEventEmitter { eventName, params ->
            sendEvent(eventName, params)
        }
    }

    override fun getName(): String = "OrderSocketModule"

    @ReactMethod
    fun connect(branchId: String, token: String, promise: Promise) {
        try {
            // Set the token first
            socketManager.setToken(token)
            
            // Start the background service
            val serviceIntent = Intent(reactApplicationContext, OrderSocketService::class.java).apply {
                putExtra(OrderSocketService.EXTRA_BRANCH_ID, branchId)
                putExtra(OrderSocketService.EXTRA_TOKEN, token)
            }
            reactApplicationContext.startService(serviceIntent)
            
            // Also connect in the module for immediate response
            scope.launch {
                try {
                    socketManager.connect(branchId)
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("SOCKET_ERROR", e.message)
                }
            }
        } catch (e: Exception) {
            promise.reject("SOCKET_ERROR", e.message)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            // Stop the background service
            val serviceIntent = Intent(reactApplicationContext, OrderSocketService::class.java)
            reactApplicationContext.stopService(serviceIntent)
            
            scope.launch {
                try {
                    socketManager.disconnect()
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("SOCKET_ERROR", e.message)
                }
            }
        } catch (e: Exception) {
            promise.reject("SOCKET_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getRecentOrders(branchId: String, promise: Promise) {
        scope.launch {
            try {
                val orders = database.orderDao().getOrdersForBranch(branchId)
                val result = Arguments.createArray()
                
                orders.collect { orderList ->
                    orderList.forEach { order ->
                        val orderMap = Arguments.createMap().apply {
                            putString("orderId", order.orderId)
                            putString("status", order.status)
                            putString("orderData", order.orderData)
                        }
                        result.pushMap(orderMap)
                    }
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                promise.reject("DATABASE_ERROR", e.message)
            }
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }
} 