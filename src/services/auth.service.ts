import AuthRepo from "../repositories/auth.repository";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateOTP, getOTPExpiry, isOTPExpired } from "../utils/otp.utils";
import { sendPasswordResetOTP, sendVerificationOTP } from "../utils/mailer";

export default class AuthSvc {
    static async register(data: {
        email: string;
        password: string;
        username: string;
        name?: string;
        mobileNumber?: string;
    }) {
        // Check if user already exists
        const existingUser = await AuthRepo.findUserByEmail(data.email);
        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        const existingUsername = await AuthRepo.findUserByUsername(data.username);
        if (existingUsername) {
            throw new Error("Username is already taken");
        }

        // Hash password (same method as login)
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto
            .pbkdf2Sync(data.password, salt, 1000, 64, 'sha512')
            .toString('hex');
        const hashedPassword = `${salt}:${hash}`;

        // GENERATE OTP
        const otp = generateOTP();           // "582941"
        const otpExpiry = getOTPExpiry();    // 5 minutes from now

        // Create user with OTP
        const user = await AuthRepo.createUser({
            email: data.email,
            password: hashedPassword,
            username: data.username,
            name: data.name,
            mobileNumber: data.mobileNumber,
            otpCode: otp,                     // Save OTP
            otpExpiry: otpExpiry,             // Save expiry
        });

        // Send verification email with OTP
        try {
            await sendVerificationOTP(user.email, otp);
            console.log(`Verification email sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            // Still log to console as backup
            console.log(`Backup - OTP for ${user.email}: ${otp}`);
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user.id },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: '1d' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET!,
            { expiresIn: '7d' }
        );

        // Save refresh token
        await AuthRepo.createSession({
            userId: user.id,
            refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name
            },
            accessToken,
            refreshToken,
            message: "Registration successful! Please check your email for verification code."
        };
    }

    static async verifyEmail(email: string, otpCode: string) {
        const user = await AuthRepo.findUserByEmail(email);

        if (!user) {
            throw new Error("User not found");
        }

        if (user.isEmailVerified) {
            throw new Error("Email already verified");
        }

        if (!user.otpCode || !user.otpExpiry) {
            throw new Error("No verification code found. Please register again.");
        }

        if (isOTPExpired(user.otpExpiry)) {
            throw new Error("Verification code expired. Please request a new one.");
        }

        if (user.otpCode !== otpCode) {
            throw new Error("Invalid verification code");
        }

        await AuthRepo.updateUser(user.id, {
            isEmailVerified: true,
            otpCode: null,
            otpExpiry: null,
        });

        return {
            message: "Email verified successfully! You can now login."
        };
    }

    static async login({ email, password }: { email: string; password: string }) {
        const user = await AuthRepo.findUserByEmail(email);
        if (!user) {
            throw "Invalid credentials";
        }

        if (!user.isEmailVerified) {
            throw "Please verify your email before logging in";
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
            refreshToken: refreshToken,
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

    static async refreshToken(refreshToken: string) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as { userId: string };

            // Find valid session
            const session = await AuthRepo.findValidSession(refreshToken);
            if (!session) {
                throw "Invalid refresh token";
            }

            // Get user
            const user = await AuthRepo.findUserById(decoded.userId);
            if (!user) {
                throw "User not found";
            }

            // Generate new access token
            const accessToken = jwt.sign(
                { userId: user.id },
                process.env.ACCESS_TOKEN_SECRET!,
                { expiresIn: '15m' }
            );

            return {
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar?.fileUrl
                }
            };
        } catch (error) {
            throw "Invalid refresh token";
        }
    }
    // Send OTP to reset password
    static async forgotPassword(email: string) {
        // Find user by email
        const user = await AuthRepo.findUserByEmail(email);

        if (!user) {
            // security
            return {
                message: "If an account exists with this email, you will receive a password reset code."
            };
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = getOTPExpiry();

        // Save OTP to user
        await AuthRepo.updateUser(user.id, {
            otpCode: otp,
            otpExpiry: otpExpiry,
        });

        // Send email with OTP
        try {
            await sendPasswordResetOTP(user.email, otp);
        } catch (error) {
            console.error('Failed to send email:', error);
            // Still log to console as backup
            console.log(` Password Reset OTP for ${user.email}: ${otp}`);
        }

        return {
            message: "If an account exists with this email, you will receive a password reset code."
        };
    }

    // Verify OTP and change password
    static async resetPassword(email: string, otpCode: string, newPassword: string) {
        // Find user by email
        const user = await AuthRepo.findUserByEmail(email);

        if (!user) {
            throw new Error("Invalid request");
        }

        // Check if OTP exists
        if (!user.otpCode || !user.otpExpiry) {
            throw new Error("No password reset request found. Please request a new code.");
        }

        // Check if OTP expired
        if (isOTPExpired(user.otpExpiry)) {
            throw new Error("Reset code has expired. Please request a new one.");
        }

        // Check if OTP matches
        if (user.otpCode !== otpCode) {
            throw new Error("Invalid reset code");
        }

        // Hash new password (same method as registration)
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto
            .pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512')
            .toString('hex');
        const hashedPassword = `${salt}:${hash}`;

        // Update password and clear OTP
        await AuthRepo.updateUser(user.id, {
            password: hashedPassword,
            otpCode: null,
            otpExpiry: null,
        });

        return {
            message: "Password reset successfully! You can now login with your new password."
        };
    }
}