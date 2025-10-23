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
                ownerId: data.ownerId
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
     * Find room by ID
     */
    static async findRoomById(roomId: string) {
        return prisma.room.findUnique({
            where: {
                id: roomId
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
     */
    static async getUserAccessibleRooms(userId: string, skip: number, limit: number) {
        return prisma.room.findMany({
            where: {
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
     * Count rooms accessible to the user
     */
    static async countUserAccessibleRooms(userId: string) {
        return prisma.room.count({
            where: {
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
     * Update room details
     */
    static async updateRoom(roomId: string, data: {
        name?: string;
        isPrivate?: boolean;
    }) {
        return prisma.room.update({
            where: {
                id: roomId
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
     * Soft delete room (using a transaction to handle related data)
     */
    static async softDeleteRoom(roomId: string) {
        // Since Room model doesn't have isDeleted field, we'll use a different approach
        // We could either add isDeleted to Room model or remove all members and mark as inactive
        // For now, let's remove all members and the room itself
        return prisma.$transaction(async (tx) => {
            // Remove all room members
            await tx.roomMember.deleteMany({
                where: {
                    roomId: roomId
                }
            });

            // Delete the room
            await tx.room.delete({
                where: {
                    id: roomId
                }
            });

            return true;
        });
    }

    /**
     * Add a member to a room
     */
    static async addRoomMember(data: {
        roomId: string;
        userId: string;
        role: string;
    }) {
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
     * Check if user is a member of the room
     */
    static async isUserRoomMember(roomId: string, userId: string) {
        const member = await prisma.roomMember.findFirst({
            where: {
                roomId: roomId,
                userId: userId
            }
        });
        return !!member;
    }

    /**
     * Check if user is the owner of the room
     */
    static async isUserRoomOwner(roomId: string, userId: string) {
        const room = await prisma.room.findFirst({
            where: {
                id: roomId,
                ownerId: userId
            }
        });
        return !!room;
    }

    /**
     * Get all members of a room
     */
    static async getRoomMembers(roomId: string) {
        return prisma.roomMember.findMany({
            where: {
                roomId: roomId
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