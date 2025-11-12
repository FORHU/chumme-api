import { prisma } from "../utils/prisma";


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
    // Use upsert to handle concurrent requests gracefully
    const artist = await prisma.artist.upsert({
        where: {
            name: data.name,
        },
        update: {
            // Only update if new data is provided
            ...(data.bio !== undefined && { bio: data.bio }),
            ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
            ...(data.genre !== undefined && { genre: data.genre }),
        },
        create: {
            name: data.name,
            bio: data.bio ?? null,
            imageUrl: data.imageUrl ?? null,
            genre: data.genre ?? null,
        },
    });

    return artist;
};