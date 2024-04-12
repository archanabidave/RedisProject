const express = require('express');
const redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Create Redis client
const redisClient = new redis();

const orders={};
// API endpoint for handling order operations
app.post('/order-operation', (req, res) => {
    const { MsgType, OperationType, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID } = req.body;
    const body=req.body;
    if (OperationType === 100) {
        addOrder(MsgType, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID, body,res);
    } else if (OperationType === 101) {
        // Pass redisClient as a parameter to updateOrder function
        updateOrder(MsgType, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID, body,res);
    } else if (OperationType === 102) {
        deleteOrder(TenantId, OMSId, Token, res);
    } else if (OperationType === 103) {
        getOrder(TenantId, OMSId, Token, redisClient,res);
    } else if (OperationType === 104) {
        getAllOrders(res);
    } else {
        res.status(400).json({ message: 'Invalid OperationType' });
    }
});

// Function to add an order
function addOrder(MsgType, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID, body,res) {
    // Check if the required fields are provided
    if (!MsgType || !TenantId || !OMSId || !OrderType || !Token || !OrderPrice || !OrderQty || !ClientID) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a unique orderid using UUID
    const orderid = uuidv4();

    // Create a unique key for the order
    const key = `order:${TenantId}:${OMSId}:${Token}`;
    if (orders[key]) {
        return res.status(409).json({ error: 'Order already exists' });
    }
    redisClient.hmset(key,body);
    orders[key] = { orderid, MsgType, OperationType: 100, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID };
    res.json({ message: 'Order added successfully', orderid });
}

// Function to update an order
function updateOrder(MsgType, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID, body,res) {
    
    if (!MsgType || !TenantId || !OMSId || !OrderType || !Token || !OrderPrice || !OrderQty || !ClientID) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a unique orderid using UUID
    const orderid = uuidv4();

    // Create a unique key for the order
    const key = `order:${TenantId}:${OMSId}:${Token}`;
    redisClient.hmset(key,body);
    orders[key] = { orderid, MsgType, OperationType: 100, TenantId, OMSId, OrderType, Token, OrderPrice, OrderQty, ClientID };
    res.json({ message: 'Order updated successfully', orderid });}

function deleteOrder(TenantId, OMSId, Token, res) {
    const key = `order:${TenantId}:${OMSId}:${Token}`; // Updated key format

    // Use the del method to delete the key
    redisClient.del(key, (err, reply) => {
        if (err) {
            // Log the error for debugging
            console.error("Error deleting order from Redis:", err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (reply === 0) {
            // Log that order was not found for debugging
            console.log("Order not found in Redis");
            return res.status(404).json({ error: 'Order not found' });
        }
        // Order deleted successfully
        res.json({ message: 'Order deleted successfully' });
    });
}
function getOrder(TenantId, OMSId, Token, redisClient, res) {
    redisClient.keys(`order:${TenantId}:${OMSId}:${Token}`, (err, keys) => {//`order:${TenantId}:${OMSId}:${Token}`
        if (err) {
            console.error('Redis error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!keys || keys.length === 0) {
            return res.status(404).json({ error: 'No records found' });
        }
        const getAllDataPromises = keys.map(key => {
            return new Promise((resolve, reject) => {
                redisClient.hgetall(key, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
        Promise.all(getAllDataPromises)
            .then(results => {
                res.json(results);
            })
            .catch(err => {
                console.error('Redis error:', err);
                res.status(500).json({ error: 'Internal server error' });
            });
    });

}


// Function to get all orders
function getAllOrders(res) {
    redisClient.keys('order:*', (err, keys) => {//`order:${TenantId}:${OMSId}:${Token}`
        if (err) {
            console.error('Redis error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!keys || keys.length === 0) {
            return res.status(404).json({ error: 'No records found' });
        }
        const getAllDataPromises = keys.map(key => {
            return new Promise((resolve, reject) => {
                redisClient.hgetall(key, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
        Promise.all(getAllDataPromises)
            .then(results => {
                res.json(results);
            })
            .catch(err => {
                console.error('Redis error:', err);
                res.status(500).json({ error: 'Internal server error' });
            });
    });

}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});