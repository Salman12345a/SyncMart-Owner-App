package com.syncmart.socket.service

import android.app.*
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.syncmart.R
import com.syncmart.socket.OrderSocketManager
import com.syncmart.socket.data.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class OrderSocketService : Service() {
    private val socketManager = OrderSocketManager()
    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())
    private lateinit var database: AppDatabase

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.getInstance(this)
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.getStringExtra(EXTRA_BRANCH_ID)?.let { branchId ->
            serviceScope.launch {
                socketManager.connect(branchId)
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotification(): Notification {
        val channelId = "order_socket_service"
        val channelName = "Order Socket Service"

        // Create notification channel for Android O and above
        val channel = NotificationChannel(
            channelId,
            channelName,
            NotificationManager.IMPORTANCE_LOW
        )
        
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("SyncMart Order Service")
            .setContentText("Listening for new orders")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        socketManager.disconnect()
    }

    companion object {
        private const val NOTIFICATION_ID = 1
        const val EXTRA_BRANCH_ID = "branch_id"
    }
} 