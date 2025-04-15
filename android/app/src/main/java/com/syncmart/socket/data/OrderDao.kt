package com.syncmart.socket.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders WHERE branchId = :branchId ORDER BY createdAt DESC")
    fun getOrdersForBranch(branchId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE orderId = :orderId")
    suspend fun getOrderById(orderId: String): OrderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Update
    suspend fun updateOrder(order: OrderEntity)

    @Query("DELETE FROM orders WHERE branchId = :branchId AND createdAt < :timestamp")
    suspend fun deleteOldOrders(branchId: String, timestamp: Long)
} 