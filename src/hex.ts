export class Hex {

    public static col(rc: number): number {
        return rc % 100;
    }

    public static row(rc: number): number {
        return Math.trunc(rc / 100);
    }

    public static format(rc: number): string {
        const col = Hex.col(rc);
        if (col < 0 || col > 50) return "??";
        return String.fromCharCode(col + 65) + String(Hex.row(rc) + 1);
    }

    public static unformat(hex: string): number {
        return hex.charCodeAt(0) - 65 + 100 * (Number(hex.substring(1)) - 1);
    }
}