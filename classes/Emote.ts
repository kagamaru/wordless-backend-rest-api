export class Emote {
    public sequenceNumber: number;
    public emoteId: string;
    public userName: string;
    public userId: string;
    public emoteDatetime: string;
    public emoteReactionId: string;
    public emoteEmojis: Array<{ emojiId: string }>;
    public userAvatarUrl: string;
    public emoteReactionEmojis: Array<{
        emojiId: string;
        numberOfReactions: number;
        reactedUserIds: string[];
    }>;
    public totalNumberOfReactions: number;

    constructor(args: {
        sequenceNumber: number;
        emoteId: string;
        userName: string;
        userId: string;
        emoteDatetime: string;
        emoteReactionId: string;
        emoteEmojis: Array<{ emojiId: string }>;
        userAvatarUrl: string;
        emoteReactionEmojis: Array<{
            emojiId: string;
            numberOfReactions: number;
            reactedUserIds: string[];
        }>;
    }) {
        const totalNumberOfReactions = args.emoteReactionEmojis.reduce(
            (sum, reaction) => sum + (reaction.numberOfReactions || 0),
            0,
        );
        this.sequenceNumber = args.sequenceNumber;
        this.emoteId = args.emoteId;
        this.userName = args.userName;
        this.userId = args.userId;
        this.emoteDatetime = args.emoteDatetime;
        this.emoteReactionId = args.emoteReactionId;
        this.emoteEmojis = args.emoteEmojis;
        this.userAvatarUrl = args.userAvatarUrl;
        this.emoteReactionEmojis = args.emoteReactionEmojis;
        this.totalNumberOfReactions = totalNumberOfReactions;
    }
}
