export interface MatchDetails {
  Game: string;
  Details: string;
}

export interface PlayerStats {
  "M1 Starts"?: number;
  "M1 Apps."?: number;
  "M1 Sub."?: number;
  "M1 Goals"?: number;
  "Open Play Goals"?: number;
  "Penalty Corners"?: number;
  "Penalty Flicks"?: number;
  "Assists"?: number;
  "Man of the match"?: number;
  "Card Points"?: number;
  "Green cards"?: number;
  "Yellow cards"?: number;
  "Conceded"?: number;
}

export interface PlayerData {
  "Squad Number": number;
  Name: string;
  Stats: PlayerStats;
  Matches: MatchDetails[];
}