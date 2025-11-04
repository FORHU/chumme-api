import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const getAllArtists = async () => {
    return prisma.artist.findMany({
        where: {
            isDeleted: false,
        },
        select: {
            id: true,
            name: true,
            bio: true,
            imageUrl: true,
        },
        orderBy: {
            name: "asc",
        },
    });
};

export const getUserArtists = async (userId: string) => {
    return await prisma.userArtist.findMany({
        where: {
            userId,
            artist: {
                isDeleted: false,
            },
        },
        include: {
            artist: {
                select: {
                    id: true,
                    name: true,
                    bio: true,
                    imageUrl: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

export const addUserArtists = async (
    userId: string,
    artistIds: string[]
) => {
    await prisma.userArtist.createMany({
        data: artistIds.map((artistId) => ({
            userId,
            artistId,
        })),
        skipDuplicates: true
    });
};

export const upsertArtist = async (data: {
    name: string;
    bio?: string | null;
    imageUrl?: string | null;
    genre?: string | null;
}) => {
    // First try to find existing artist
    let artist = await prisma.artist.findFirst({
        where: {
            name: data.name,
            isDeleted: false,
        },
    });

    // If not found, create new artist
    if (!artist) {
        artist = await prisma.artist.create({
            data: {
                name: data.name,
                bio: data.bio ?? null,
                imageUrl: data.imageUrl ?? null,
                genre: data.genre ?? null,
            },
        });
    }

    return artist;
};