import * as d3 from 'd3';

export interface CityScore {
    city: string;
    score: number;
    主动掌控对话节奏: number;
    异议应对韧性: number;
    决策推进与闭环: number;
    量化价值呈现: number;
    灵活应变能力: number;
    情绪感染力: number;
}

export interface ProvinceData {
    province: string;
    cities: CityScore[];
    averageScore: number;
}

// 城市到省份的映射
const cityToProvince: { [key: string]: string } = {
    '北京': '北京市',
    '上海': '上海市',
    '广州': '广东省',
    '深圳': '广东省',
    '杭州': '浙江省',
    '南京': '江苏省',
    '苏州': '江苏省',
    '成都': '四川省',
    '重庆': '重庆市',
    '武汉': '湖北省',
    '西安': '陕西省',
    '天津': '天津市',
    '长沙': '湖南省',
    '青岛': '山东省',
    '厦门': '福建省',
    '大连': '辽宁省',
    '宁波': '浙江省',
    '郑州': '河南省',
    '济南': '山东省',
    '福州': '福建省',
    '东莞': '广东省',
    '无锡': '江苏省',
    '合肥': '安徽省',
    '昆明': '云南省',
    '哈尔滨': '黑龙江省',
    '沈阳': '辽宁省',
    '长春': '吉林省',
    '南宁': '广西壮族自治区',
    '贵阳': '贵州省',
    '太原': '山西省',
    '石家庄': '河北省',
    '南昌': '江西省',
    '兰州': '甘肃省',
    '海口': '海南省',
    '乌鲁木齐': '新疆维吾尔自治区',
    '呼和浩特': '内蒙古自治区',
    '银川': '宁夏回族自治区',
    '西宁': '青海省',
    '拉萨': '西藏自治区'
};

// 省份名称映射
const getProvinceShortName = (fullName: string): string => {
    const nameMap: { [key: string]: string } = {
        '广西壮族自治区': '广西',
        '新疆维吾尔自治区': '新疆',
        '内蒙古自治区': '内蒙古',
        '宁夏回族自治区': '宁夏',
        '西藏自治区': '西藏',
        '黑龙江省': '黑龙江',
        '吉林省': '吉林',
        '辽宁省': '辽宁',
        '河北省': '河北',
        '山西省': '山西',
        '陕西省': '陕西',
        '山东省': '山东',
        '河南省': '河南',
        '江苏省': '江苏',
        '浙江省': '浙江',
        '安徽省': '安徽',
        '江西省': '江西',
        '福建省': '福建',
        '湖南省': '湖南',
        '湖北省': '湖北',
        '广东省': '广东',
        '海南省': '海南',
        '四川省': '四川',
        '贵州省': '贵州',
        '云南省': '云南',
        '青海省': '青海',
        '甘肃省': '甘肃',
        '台湾省': '台湾',
        '北京市': '北京',
        '天津市': '天津',
        '上海市': '上海',
        '重庆市': '重庆',
        '香港特别行政区': '香港',
        '澳门特别行政区': '澳门'
    };
    return nameMap[fullName] || fullName;
};

export const loadCityData = async (): Promise<{
    provinceData: { name: string; value: number }[];
    cityDetailMap: { [key: string]: ProvinceData };
}> => {
    try {
        const data = await d3.csv('/data/processed_city_data.csv');
        
        const cityScores = data.map(item => ({
            city: item.d5_name || '',
            score: Number(item.城市士气综合得分) || 0,
            主动掌控对话节奏: Number(item.主动掌控对话节奏) || 0,
            异议应对韧性: Number(item.异议应对韧性) || 0,
            决策推进与闭环: Number(item.决策推进与闭环) || 0,
            量化价值呈现: Number(item.量化价值呈现) || 0,
            灵活应变能力: Number(item.灵活应变能力) || 0,
            情绪感染力: Number(item.情绪感染力) || 0
        }));

        // 按省份分组并计算平均分
        const provinceMap = new Map<string, ProvinceData>();
        
        cityScores.forEach(cityScore => {
            if (!cityScore.city) return;
            
            const province = cityToProvince[cityScore.city];
            if (!province) {
                console.warn(`No province mapping found for city: ${cityScore.city}`);
                return;
            }
            
            const shortProvinceName = getProvinceShortName(province);
            if (!provinceMap.has(shortProvinceName)) {
                provinceMap.set(shortProvinceName, {
                    province: shortProvinceName,
                    cities: [],
                    averageScore: 0
                });
            }
            const provinceData = provinceMap.get(shortProvinceName)!;
            provinceData.cities.push(cityScore);
        });

        // 计算每个省份的平均分
        const cityDetailMap: { [key: string]: ProvinceData } = {};
        const provinceData: { name: string; value: number }[] = [];

        provinceMap.forEach((data, province) => {
            if (data.cities.length > 0) {
                const averageScore = data.cities.reduce((sum, city) => sum + city.score, 0) / data.cities.length;
                data.averageScore = averageScore;
                cityDetailMap[province] = data;
                provinceData.push({
                    name: province,
                    value: averageScore
                });
                console.log(`Province: ${province}, Score: ${averageScore}`); // 添加日志
            }
        });

        return { provinceData, cityDetailMap };
    } catch (error) {
        console.error('Error loading city data:', error);
        return { provinceData: [], cityDetailMap: {} };
    }
}; 