import jwt from 'jsonwebtoken';

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
	try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({
				success: false,
				message: 'Access denied. No token provided.'
			});
		}

		// Extract token
		const token = authHeader.split(' ')[1];

		// Verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET || '1223');
		
		// Attach user info to request
		req.user = {
			id: decoded.userId,
			name: decoded.name,
			phone: decoded.phone,
			role: decoded.role
		};

		next();
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return res.status(401).json({
				success: false,
				message: 'Token expired. Please login again.'
			});
		}
		
		return res.status(401).json({
			success: false,
			message: 'Invalid token.'
		});
	}
};

// Middleware to check if user is faculty
export const isFaculty = (req, res, next) => {
	if (req.user?.role !== 'FACULTY') {
		return res.status(403).json({
			success: false,
			message: 'Access denied. Faculty role required.'
		});
	}
	next();
};

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
	if (req.user?.role !== 'ADMIN') {
		return res.status(403).json({
			success: false,
			message: 'Access denied. Admin role required.'
		});
	}
	next();
};

// Middleware to check if user is student
export const isStudent = (req, res, next) => {
	if (req.user?.role !== 'STUDENT') {
		return res.status(403).json({
			success: false,
			message: 'Access denied. Student role required.'
		});
	}
	next();
};

// Combined middleware for verifying token and checking faculty role
export const verifyFaculty = [verifyToken, isFaculty];

// Combined middleware for verifying token and checking admin role
export const verifyAdmin = [verifyToken, isAdmin];

// Combined middleware for verifying token and checking student role
export const verifyStudent = [verifyToken, isStudent];

export default {
	verifyToken,
	isFaculty,
	isAdmin,
	isStudent,
	verifyFaculty,
	verifyAdmin,
	verifyStudent
};

// Attach req.user when a valid Bearer token is sent; never rejects the request
export const optionalAuth = (req, _res, next) => {
	const authHeader = req.headers.authorization || '';
	if (authHeader.startsWith('Bearer ')) {
		try {
			const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || '1223');
			req.user = { id: decoded.userId, name: decoded.name, phone: decoded.phone, role: decoded.role };
		} catch {
			/* invalid or expired token: continue as anonymous */
		}
	}
	next();
};
