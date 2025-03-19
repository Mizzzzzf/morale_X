import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { loadCityData } from '../utils/cityDataLoader';
import { registerChinaMap } from '../utils/mapRegister';
import useWindowSize from '../hooks/useWindowSize';

interface ProvinceData {
    name: string;
    value: number;
    coordinates: [number, number];
}

// 省份名称映射表
const provinceMap: { [key: string]: string } = {
    '北京': '北京',
    '上海': '上海',
    '广州': '广东',
    '深圳': '广东',
    '杭州': '浙江',
    '南京': '江苏',
    '武汉': '湖北',
    '成都': '四川',
    '重庆': '重庆',
    '西安': '陕西',
    '呼叫中心': '青海',
    '东莞': '广东',
    '佛山': '广东',
    '南昌': '江西',
    '厦门': '福建',
    '合肥': '安徽',
    '天津': '天津',
    '宁波': '浙江',
    '无锡': '江苏',
    '昆明': '云南',
    '济南': '山东',
    '福州': '福建',
    '苏州': '江苏',
    '郑州': '河南',
    '金华': '浙江',
    '长沙': '湖南',
    '青岛': '山东',
    '石家庄': '河北'
};

const CityMap: React.FC = () => {
    const navigate = useNavigate();
    const [cityData, setCityData] = useState<ProvinceData[]>([]);
    const [mapLoaded, setMapLoaded] = useState(false);
    const { height: windowHeight } = useWindowSize();

    // 计算省份平均评分
    const getProvinceData = () => {
        const provinceScores: { [key: string]: number[] } = {};
        
        // 收集每个省份的所有评分
        cityData.forEach(city => {
            const province = provinceMap[city.name];
            if (province) {
                if (!provinceScores[province]) {
                    provinceScores[province] = [];
                }
                provinceScores[province].push(city.value);
            }
        });
        
        // 查找呼叫中心的评分
        let callCenterScore = 6.12162; // 呼叫中心的实际评分
        const callCenterCity = cityData.find(city => city.name === '呼叫中心');
        if (callCenterCity) {
            callCenterScore = callCenterCity.value;
        }
        
        // 中国所有省份列表
        const allProvinces = [
            '北京', '天津', '河北', '山西', '内蒙古', 
            '辽宁', '吉林', '黑龙江', '上海', '江苏', 
            '浙江', '安徽', '福建', '江西', '山东', 
            '河南', '湖北', '湖南', '广东', '广西', 
            '海南', '重庆', '四川', '贵州', '云南', 
            '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
        ];
        
        // 计算每个省份的平均评分，对于没有数据的省份使用呼叫中心的评分
        const result = allProvinces.map(province => {
            if (provinceScores[province] && provinceScores[province].length > 0) {
                // 有数据的省份使用自己的平均评分
                const scores = provinceScores[province];
                const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                return {
                    name: province,
                    value: avgScore
                };
            } else {
                // 没有数据的省份使用呼叫中心的评分
                return {
                    name: province,
                    value: callCenterScore
                };
            }
        });
        
        return result;
    };

    useEffect(() => {
        const init = async () => {
            try {
                await registerChinaMap();
                setMapLoaded(true);
                const data = await loadCityData();
                console.log('Loaded city data:', data);
                setCityData(data);
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        };
        init();
    }, []);

    // 根据窗口大小计算最佳地图参数
    const getMapParams = () => {
        // 根据屏幕高度调整地图缩放和位置
        let zoom, topOffset;
        
        if (windowHeight < 600) {
            zoom = 1;
            topOffset = 80;
        } else if (windowHeight < 800) {
            zoom = 1.2;
            topOffset = 100;
        } else if (windowHeight < 1000) {
            zoom = 1.5;
            topOffset = 180;
        } else {
            zoom = 1.3;
            topOffset = 180;
        }
        
        return { zoom, topOffset };
    };

    const getOption = (): EChartsOption => {
        const { zoom, topOffset } = getMapParams();
        
        return {
            backgroundColor: '#fff',
            title: {
                text: '城市士气看板',
                left: 'center',
                top: 20
            },
            tooltip: {
                show: false // 完全禁用全局tooltip
            },
            visualMap: {
                min: 5,
                max: 8,
                text: ['高', '低'],
                realtime: false,
                calculable: true,
                inRange: {
                    color: ['#e0ffff', '#006edd']
                },
                left: 'left',
                top: 'bottom'
            },
            geo: {
                map: 'china',
                roam: false,
                zoom: zoom,
                top: topOffset,
                itemStyle: {
                    areaColor: '#f3f3f3',
                    borderColor: '#fff'
                }
            },
            series: [
                {
                    name: '省份士气',
                    type: 'map',
                    map: 'china',
                    roam: false,
                    zoom: zoom,
                    top: topOffset,
                    label: {
                        show: true,
                        formatter: (params: any) => {
                            // 显示所有省份的名称
                            return params.name;
                        },
                        fontSize: windowHeight < 800 ? 10 : 12
                    },
                    itemStyle: {
                        areaColor: '#f3f3f3',
                        borderColor: '#fff'
                    },
                    emphasis: {
                        disabled: true
                    },
                    select: {
                        disabled: true
                    },
                    data: getProvinceData(),
                    zlevel: 1
                },
                {
                    name: '城市士气',
                    type: 'effectScatter',
                    coordinateSystem: 'geo',
                    data: cityData.map(item => ({
                        name: item.name,
                        value: [
                            item.coordinates[0],
                            item.coordinates[1],
                            item.value
                        ]
                    })),
                    symbolSize: windowHeight < 800 ? 12 : 15,
                    itemStyle: {
                        color: '#1890ff',
                        borderColor: '#888',
                        borderWidth: 1
                    },
                    label: {
                        show: false,
                        formatter: (params: any) => {
                            return `${params.name}: ${params.value[2].toFixed(1)}`;
                        },
                        position: 'right',
                        distance: 10,
                        backgroundColor: '#fff',
                        padding: [12, 24],
                        borderRadius: 2,
                        fontSize: 13,
                        color: '#444',
                        borderColor: '#ccc',
                        borderWidth: 1
                    },
                    emphasis: {
                        scale: 1.2,
                        label: {
                            show: true,
                            fontSize: 13,
                            backgroundColor: '#fff',
                            padding: [12, 24],
                            borderRadius: 2
                        }
                    },
                    zlevel: 2
                }
            ]
        };
    };

    const handleChartEvents = {
        'click': (params: any) => {
            console.log('Chart clicked:', params);
            
            // 判断是否点击了城市点
            if (params.componentType === 'series' && 
                (params.seriesType === 'effectScatter' || params.seriesType === 'scatter')) {
                const cityName = params.name;
                navigate(`/team?city=${cityName}`);
            }
        }
    };

    // 计算容器高度
    const getContainerHeight = () => {
        // 根据屏幕高度计算合适的容器高度
        // 在小屏幕上使用更小的高度，但确保地图仍然可见
        if (windowHeight < 600) {
            return '500px'; // 非常小的屏幕
        } else if (windowHeight < 800) {
            return '600px'; // 小屏幕
        } else if (windowHeight < 1000) {
            return '750px'; // 中等屏幕
        } else {
            return '1000px'; // 大屏幕
        }
    };

    if (!mapLoaded) {
        return <div>加载中...</div>;
    }

    return (
        <div style={{ 
            width: '100%', 
            height: getContainerHeight(),
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            marginTop: '20px',
            overflow: 'hidden' // 防止内容溢出
        }}>
            <ReactECharts 
                option={getOption()} 
                style={{ height: '100%', width: '100%' }}
                onEvents={handleChartEvents}
            />
        </div>
    );
};

export default CityMap; 