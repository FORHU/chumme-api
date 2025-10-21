import AuthRepo from "../repositories/auth.repository";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export default class AuthSvc {
    static async register({
        email,
        password,
        username,
        name
    }: {
        email: string;
        password: string;
        username: string;
        name?: string;
    }) {
        const existingUser = await AuthRepo.findUserByEmailOrUsername(email, username);
        if (existingUser) {
            throw "This email or username is already registered";
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto
            .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
            .toString('hex');

        return AuthRepo.createUser({
            email,
            password: `${salt}:${hashedPassword}`,
            username,
            name
        });
    }

    static async login({ email, password }: { email: string; password: string }) {
        const user = await AuthRepo.findUserByEmail(email);
        if (!user) {
            throw "Invalid credentials";
        }

        // Verify password
        const [salt, storedHash] = user.password.split(':');
        const hash = crypto
            .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
            .toString('hex');

        if (storedHash !== hash) {
            throw "Invalid credentials";
        }

        // Update login status
        await AuthRepo.updateUserLoginStatus(user.id);

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user.id },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET!,
            { expiresIn: '7d' }
        );

        // Create session with refresh token
        await AuthRepo.createSession({
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                role: user.role,
                avatar: user.avatar?.fileUrl
            }
        };
    }
}