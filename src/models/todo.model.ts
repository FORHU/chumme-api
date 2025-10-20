export type TTodo = {
    id?: string;
    title: string;
    description: string;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type TTodoCreateInput = {
    title: string;
    description: string;
    status?: string;
};

export type TTodoUpdateInput = {
    id: string;
    title?: string;
    description?: string;
    status?: string;
};
