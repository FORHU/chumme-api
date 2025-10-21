import AuthRepo from "../repositories/auth.repository";
import crypto from "crypto";

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
        if (!existingUser) {
            throw "User not found";
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
}