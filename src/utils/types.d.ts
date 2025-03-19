declare module '*.json' {
    const value: any;
    export default value;
}

interface ProvinceData {
    name: string;
    value: number;
    coordinates: [number, number];
}

interface CityData {
    d5_name: string;
    城市士气综合得分: number;
} 