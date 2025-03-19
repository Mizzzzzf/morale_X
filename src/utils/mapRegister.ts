import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
    GeoComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { GeoJSONSourceInput } from 'echarts/types/src/coord/geo/geoTypes';

echarts.use([
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
    GeoComponent,
    MapChart,
    CanvasRenderer
]);

const provinceMap: { [key: string]: string } = {
    '北京市': '北京',
    '天津市': '天津',
    '河北省': '河北',
    '山西省': '山西',
    '内蒙古自治区': '内蒙古',
    '辽宁省': '辽宁',
    '吉林省': '吉林',
    '黑龙江省': '黑龙江',
    '上海市': '上海',
    '江苏省': '江苏',
    '浙江省': '浙江',
    '安徽省': '安徽',
    '福建省': '福建',
    '江西省': '江西',
    '山东省': '山东',
    '河南省': '河南',
    '湖北省': '湖北',
    '湖南省': '湖南',
    '广东省': '广东',
    '广西壮族自治区': '广西',
    '海南省': '海南',
    '重庆市': '重庆',
    '四川省': '四川',
    '贵州省': '贵州',
    '云南省': '云南',
    '西藏自治区': '西藏',
    '陕西省': '陕西',
    '甘肃省': '甘肃',
    '青海省': '青海',
    '宁夏回族自治区': '宁夏',
    '新疆维吾尔自治区': '新疆'
};

export const registerChinaMap = async () => {
    try {
        const response = await fetch('/china.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const chinaJson = await response.json();
        console.log('Loaded China map data:', chinaJson);

        // 修改地图数据中的区域名称
        if (chinaJson.features) {
            chinaJson.features = chinaJson.features.map((feature: any) => {
                if (feature.properties) {
                    const fullName = feature.properties.name;
                    feature.properties.name = provinceMap[fullName] || fullName;
                }
                return feature;
            });
        }

        echarts.registerMap('china', chinaJson);
        console.log('Map registered successfully with province names:', 
            chinaJson.features.map((f: any) => f.properties.name));
    } catch (error) {
        console.error('Error registering China map:', error);
        throw error;
    }
}; 