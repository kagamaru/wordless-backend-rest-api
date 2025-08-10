// NOTE: 環境変数を別モジュールにまとめることで、再利用性とテスト性を向上させる

export const envConfig = {
    EMOTE_TABLE: process.env.EMOTE_TABLE,
    EMOTE_REACTION_TABLE: process.env.EMOTE_REACTION_TABLE,
    USERS_TABLE: process.env.USERS_TABLE,
    USER_SUB_TABLE: process.env.USER_SUB_TABLE,
    USER_SUKI_TABLE: process.env.USER_SUKI_TABLE,
    FRONTEND_URL: process.env.FRONTEND_URL,
    ALLOW_ORIGIN: process.env.ALLOW_ORIGIN,
    USER_IMAGE_BUCKET: process.env.USER_IMAGE_BUCKET,
    CLOUDFRONT_USER_IMAGE_URL: process.env.CLOUDFRONT_USER_IMAGE_URL,
    AWS_REGION: process.env.AWS_REGION,
};

export const dbConfig = {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
};
