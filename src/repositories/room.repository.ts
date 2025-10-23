import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class RoomRepo {
    /**
     * Find user by ID to check if user exists and is not deleted
     */
    static async findUserById(userId: string) {
        return prisma.user.findUnique({
            where: {
                id: userId,
                isDeleted: false
            }
        });
    }

    /**
     * Create a new room
     */
    static async createRoom(data: {
        name: string;
        isPrivate: boolean;
        ownerId: string;
    }) {
        return prisma.room.create({
            data: {
                name: data.name,
                isPrivate: data.isPrivate,
                ownerId: data.ownerId,
                isDeleted: false
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: {
                            select: {
                                fileUrl: true
                            }
                        }
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: {
                                    select: {
                                        fileUrl: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        messages: true
                    }
                }
            }
        });
    }

    /**
     * Find room by ID (only non-deleted rooms)
     */
    static async findRoomById(roomId: string) {
        return prisma.room.findUnique({
            where: {
                id: roomId,
                isDeleted: false
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: {
                            select: {
                                fileUrl: true
                            }
                        }
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: {
                                    select: {
                                        fileUrl: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        messages: true
                    }
                }
            }
        });
    }

    /**
     * Get rooms accessible to the user (public rooms + private rooms where user is member)
     * Only non-deleted rooms
     */
    static async getUserAccessibleRooms(userId: string, skip: number, limit: number) {
        return prisma.room.findMany({
            where: {
                isDeleted: false, // Add this condition
                OR: [
                    { isPrivate: false }, // Public rooms
                    { 
                        isPrivate: true,
                        members: {
                            some: {
                                userId: userId
                            }
                        }
                    } // Private rooms where user is a member
                ]
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: {
                            select: {
                                fileUrl: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        messages: true
                    }
                }
            }
        });
    }

    /**
     * Count rooms accessible to the user (only non-deleted rooms)
     */
    static async countUserAccessibleRooms(userId: string) {
        return prisma.room.count({
            where: {
                isDeleted: false, // Add this condition
                OR: [
                    { isPrivate: false }, // Public rooms
                    { 
                        isPrivate: true,
                        members: {
                            some: {
                                userId: userId
                            }
                        }
                    } // Private rooms where user is a member
                ]
            }
        });
    }

    /**
     * Update room details (only non-deleted rooms)
     */
    static async updateRoom(roomId: string, data: {
        name?: string;
        isPrivate?: boolean;
    }) {
        return prisma.room.update({
            where: {
                id: roomId,
                isDeleted: false // Add this condition
            },
            data: {
                ...data,
                updatedAt: new Date()
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: {
                            select: {
                                fileUrl: true
                            }
                        }
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: {
                                    select: {
                                        fileUrl: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        messages: true
                    }
                }
            }
        });
    }

    /**
     * Soft delete room
     */
    static async softDeleteRoom(roomId: string) {
        return prisma.room.update({
            where: {
                id: roomId,
                isDeleted: false // Only delete non-deleted rooms
            },
            data: {
                isDeleted: true,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Add a member to a room (only non-deleted rooms)
     */
    static async addRoomMember(data: {
        roomId: string;
        userId: string;
        role: string;
    }) {
        // First check if room exists and is not deleted
        const room = await prisma.room.findFirst({
            where: {
                id: data.roomId,
                isDeleted: false
            }
        });

        if (!room) {
            throw new Error("Room not found or has been deleted");
        }

        return prisma.roomMember.create({
            data: {
                roomId: data.roomId,
                userId: data.userId,
                role: data.role
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: {
                            select: {
                                fileUrl: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Remove a member from a room
     */
    static async removeRoomMember(roomId: string, userId: string) {
        return prisma.roomMember.deleteMany({
            where: {
                roomId: roomId,
                userId: userId
            }
        });
    }

    /**
     * Check if user is a member of the room (only non-deleted rooms)
     */
    static async isUserRoomMember(roomId: string, userId: string) {
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId,
                room: {
                    isDeleted: false // Add this condition
                }
            }
        });
        return !!member;
    }

    /**
     * Check if user is the owner of the room (only non-deleted rooms)
     */
    static async isUserRoomOwner(roomId: string, userId: string) {
        const room = await prisma.room.findFirst({
            where: {
                id: roomId,
                ownerId: userId,
                isDeleted: false // Add this condition
            }
        });
        return !!room;
    }

    /**
     * Get all members of a room (only non-deleted rooms)
     */
    static async getRoomMembers(roomId: string) {
        return prisma.roomMember.findMany({
            where: {
                roomId: roomId,
                room: {
                    isDeleted: false // Add this condition
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatar: {
                            select: {
                                fileUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                joinedAt: 'asc'
            }
        });
    }
}