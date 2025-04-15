package com.syncmart.socket.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import org.json.JSONObject

@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val orderId: String,
    val branchId: String,
    val orderData: String, // JSON string of full order data
    val status: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) 