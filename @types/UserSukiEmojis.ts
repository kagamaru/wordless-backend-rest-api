import { EmojiString } from "@/@types";

export type UserSukiEmojis =
    | [EmojiString]
    | [EmojiString, EmojiString]
    | [EmojiString, EmojiString, EmojiString]
    | [EmojiString, EmojiString, EmojiString, EmojiString];
