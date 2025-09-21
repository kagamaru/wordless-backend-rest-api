export const verifyUserId = (userId: any): "ok" | "error" => {
    if (userId.length === 0 || userId.length > 24) {
        return "error";
    }

    if (!/^@[a-z0-9_]{1,23}$/.test(userId)) {
        return "error";
    }

    return "ok";
};
