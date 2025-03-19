import * as d3 from 'd3';

const cityCoordinates: { [key: string]: [number, number] } = {
    '北京': [116.405285, 39.904989],
    '上海': [121.472644, 31.231706],
    '广州': [113.280637, 23.125178],
    '深圳': [114.085947, 22.547],
    '杭州': [120.153576, 30.287459],
    '南京': [118.767413, 32.041544],
    '武汉': [114.298572, 30.584355],
    '成都': [104.065735, 30.659462],
    '重庆': [106.504962, 29.533155],
    '西安': [108.948024, 34.263161],
    '呼叫中心': [96.778916, 36.623178],
    '东莞': [113.746262, 23.046237],
    '佛山': [113.121416, 23.021548],
    '南昌': [115.858198, 28.682892],
    '厦门': [118.089425, 24.479834],
    '合肥': [117.227239, 31.820587],
    '天津': [117.190182, 39.125596],
    '宁波': [121.549792, 29.868388],
    '无锡': [120.301663, 31.574729],
    '昆明': [102.712251, 25.040609],
    '济南': [117.000923, 36.675807],
    '福州': [119.306239, 26.075302],
    '苏州': [120.585316, 31.298886],
    '郑州': [113.665412, 34.757975],
    '金华': [119.649506, 29.089524],
    '长沙': [112.982279, 28.19409],
    '青岛': [120.355173, 36.082982],
    '石家庄': [114.502461, 38.045474]
};

export interface ProvinceData {
    name: string;
    value: number;
    coordinates: [number, number];
}

interface RawCityData {
    d5_name: string;
    城市士气综合得分: string;
}

export const loadCityData = async (): Promise<ProvinceData[]> => {
    try {
        const response = await fetch('/data/processed_city_data.csv');
        const text = await response.text();
        const data = d3.csvParse(text) as RawCityData[];
        
        return data.map(city => ({
            name: city.d5_name,
            value: Number(city.城市士气综合得分) || 0,
            coordinates: cityCoordinates[city.d5_name] || [0, 0]
        }));
    } catch (error) {
        console.error('Error loading city data:', error);
        return [];
    }
}; 