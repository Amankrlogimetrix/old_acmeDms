const extractClientIP = (req, res, next) => {
    try {
        const forwardedFor = req.headers['x-forwarded-for'];
        const userIP = forwardedFor ? forwardedFor.split(',')[0] : req.connection.remoteAddress;
        const ipv4Address = userIP.includes('::ffff:') ? userIP.split(':').pop() : userIP;
  
        req.clientIP = ipv4Address;
        console.log('Client IP:', req.clientIP);
        next();
    } catch (error) {
        console.error('Error extracting client IP:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {extractClientIP}