export class IDS {
    static readonly AVAILABLE_ZCARDS: string = 'bbl_available_zcards';
    static readonly BOARD = 'bbl_board';
    static readonly OFF_BOARD = 'bbl_offboard';
    static readonly HAND = 'bbl_hand';
    static readonly MAIN = 'bbl_main';

    static handcount(playerId: number): string {
        return `bbl_handcount_${playerId}`;
    }

    static poolcount(playerId: number): string {
        return `bbl_poolcount_${playerId}`;
    }

    static citycount(playerId: number): string {
        return `bbl_citycount_${playerId}`;
    }

    static hexDiv(rc: number): string {
        return `bbl_hex_${rc}`;
    }

    static playerBoardZcards(playerId: number): string {
        return `bbl_zcards_${playerId}`;
    }

    static zcard(type: string): string {
        return `bbl_${type}`;
    }
}
