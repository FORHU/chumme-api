import AuthRepo from "../repositories/auth.repository";

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
            const field = existingUser.email === email ? 'email' : 'username';
            throw `This ${field} is already registered`;
        }

        return AuthRepo.createUser({ email, password, username, name });
    }
}