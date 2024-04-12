const express = require('express');
const redis = require('ioredis');

const app = express();
app.use(express.json());

const redisClient = redis.createClient({
    host: '10.10.198.180', // Update with your Redis server IP
    port: 6379 // Default Redis port
});

// Function to validate ClientInfo
function validateClientInfo(clientInfo) {
    if (!clientInfo || typeof clientInfo !== 'object') {
        return false;
    }
    const requiredFields = ['MsgType', 'OperationType', 'TenantId', 'OSMId', 'ClientId', 'ClientName'];
    return requiredFields.every(field => clientInfo.hasOwnProperty(field));
}

// API endpoint for handling client operations
app.post('/client-operation', (req, res) => {
    const { MsgType, OperationType, TenantId, OSMId, ClientId, ClientName } = req.body;

    if (OperationType === 100) {
        addClient(MsgType, TenantId, OSMId, ClientId, ClientName, res);
    } else if (OperationType === 101) {
        updateClient(TenantId, OSMId, ClientId, ClientName, res);
    } else if (OperationType === 102) {
        deleteClient(TenantId, OSMId, ClientId, res);
    } else if (OperationType === 103) {
        getClient(TenantId, OSMId, ClientId, res);
    } else if (OperationType === 104) {
        getAllClients(res);
    } else {
        res.status(400).json({ message: 'Invalid OperationType' });
    }
});


// Function to add a client
function addClient(MsgType, TenantId, OSMId, ClientId, ClientName, res) {
    // Implementation for adding a client
    // Check if the required fields are provided
    if (!MsgType || !TenantId || !OSMId || !ClientId || !ClientName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the client already exists
    const key = `${TenantId}_${OSMId}_${ClientId}`;
    redisClient.get(key, (err, reply) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (reply) {
            return res.status(409).json({ error: 'Client already exists' });
        }

        // If client does not exist, add it to Redis
        const clientInfo = {
            MsgType,
            OperationType: 100, // Assuming 100 represents adding a client
            TenantId,
            OSMId,
            ClientId,
            ClientName
        };

        // Store client information in Redis
        redisClient.set(key, JSON.stringify(clientInfo), (err, reply) => {
            if (err) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json({ message: 'Client added successfully' });
        });
    });
}

// Function to update a client
function updateClient(TenantId, OSMId, ClientId, NewClientName, res) {
    // Check if the required fields are provided
    if (!TenantId || !OSMId || !ClientId || !NewClientName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the client exists
    const key = `${TenantId}_${OSMId}_${ClientId}`;
    redisClient.get(key, (err, reply) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (!reply) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // If client exists, update its information in Redis
        const clientInfo = JSON.parse(reply);
        clientInfo.ClientName = NewClientName;

        // Store updated client information in Redis
        redisClient.set(key, JSON.stringify(clientInfo), (err, reply) => {
            if (err) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json({ message: 'Client updated successfully' });
        });
    });
}

// Function to delete a client
function deleteClient(TenantId, OSMId, ClientId, res) {
    // Check if the required fields are provided
    if (!TenantId || !OSMId || !ClientId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the client exists
    const key = `${TenantId}_${OSMId}_${ClientId}`;
    redisClient.del(key, (err, reply) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (reply === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ message: 'Client deleted successfully' });
    });
}

// Function to get a particular client based on ClientId
function getClient(TenantId, OSMId, ClientId, res) {
    // Check if the required fields are provided
    if (!TenantId || !OSMId || !ClientId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the client exists
    const key = `${TenantId}_${OSMId}_${ClientId}`;
    redisClient.get(key, (err, reply) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (!reply) {
            return res.status(404).json({ error: 'Client not found' });
        }
        const clientInfo = JSON.parse(reply);
        res.json(clientInfo);
    });
}

// Function to get all clients
function getAllClients(res) {
    redisClient.keys('*_*_*', (err, keys) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (keys.length === 0) {
            return res.json([]);
        }
        const clients = [];
        let count = 0;
        keys.forEach(key => {
            redisClient.get(key, (err, reply) => {
                if (err) {
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                const clientInfo = JSON.parse(reply);
                clients.push(clientInfo);
                if (++count === keys.length) {
                    res.json(clients);
                }
            });
        });
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
