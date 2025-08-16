export const verifyUserName = (userName: any): "ok" | "error" => {
    if (userName.length === 0 || userName.length > 24) {
        return "error";
    }

    if (!/^[A-Za-z0-9._-]+$/.test(userName)) {
        return "error";
    }

    return "ok";
};
