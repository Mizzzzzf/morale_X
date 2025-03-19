import * as d3 from 'd3';

export interface SalesScore {
    销售: string;
    主动掌控对话节奏: number;
    异议应对韧性: number;
    决策推进与闭环: number;
    量化价值呈现: number;
    灵活应变能力: number;
    情绪感染力: number;
    销售士气综合得分: number;
    理由: string;
    城市?: string;
    团队?: string;
}

interface SalesScoreWithCount extends SalesScore {
    count: number;
}

export const loadSalesData = async (): Promise<SalesScore[]> => {
    try {
        const data = await d3.csv<any>('/data/processed_sales_data.csv');
        
        // 按销售名字分组并计算均值
        const salesMap = new Map<string, SalesScoreWithCount>();
        
        data.forEach(row => {
            const salesName = row.user_name;
            if (!salesMap.has(salesName)) {
                salesMap.set(salesName, {
                    销售: salesName,
                    主动掌控对话节奏: 0,
                    异议应对韧性: 0,
                    决策推进与闭环: 0,
                    量化价值呈现: 0,
                    灵活应变能力: 0,
                    情绪感染力: 0,
                    销售士气综合得分: Number(row.销售士气综合得分) || 0, // 直接使用文件中的综合得分
                    理由: '',
                    城市: row.城市 || row.city || '',
                    团队: row.团队 || row.d8_name || '',
                    count: 0
                });
            }
            
            const current = salesMap.get(salesName)!;
            current.主动掌控对话节奏 += Number(row.主动掌控对话节奏) || 0;
            current.异议应对韧性 += Number(row.异议应对韧性) || 0;
            current.决策推进与闭环 += Number(row.决策推进与闭环) || 0;
            current.量化价值呈现 += Number(row.量化价值呈现) || 0;
            current.灵活应变能力 += Number(row.灵活应变能力) || 0;
            current.情绪感染力 += Number(row.情绪感染力) || 0;
            // 不需要累加综合得分，因为我们直接使用文件中的值
            if (row.理由) {
                current.理由 = current.理由 
                    ? current.理由 + '\n' + row.理由 
                    : row.理由;
            }
            current.count++;
        });

        // 计算均值并转换为数组
        return Array.from(salesMap.values()).map(sale => ({
            销售: sale.销售,
            主动掌控对话节奏: sale.主动掌控对话节奏 / sale.count,
            异议应对韧性: sale.异议应对韧性 / sale.count,
            决策推进与闭环: sale.决策推进与闭环 / sale.count,
            量化价值呈现: sale.量化价值呈现 / sale.count,
            灵活应变能力: sale.灵活应变能力 / sale.count,
            情绪感染力: sale.情绪感染力 / sale.count,
            销售士气综合得分: sale.销售士气综合得分, // 直接使用，不需要除以 count
            理由: sale.理由,
            城市: sale.城市,
            团队: sale.团队
        }));
    } catch (error) {
        console.error('Error loading sales data:', error);
        return [];
    }
};

export const calculateAverageScores = (data: SalesScore[]): Omit<SalesScore, '销售'> => {
    const sum = data.reduce((acc, curr) => ({
        主动掌控对话节奏: acc.主动掌控对话节奏 + curr.主动掌控对话节奏,
        异议应对韧性: acc.异议应对韧性 + curr.异议应对韧性,
        决策推进与闭环: acc.决策推进与闭环 + curr.决策推进与闭环,
        量化价值呈现: acc.量化价值呈现 + curr.量化价值呈现,
        灵活应变能力: acc.灵活应变能力 + curr.灵活应变能力,
        情绪感染力: acc.情绪感染力 + curr.情绪感染力,
        销售士气综合得分: acc.销售士气综合得分 + curr.销售士气综合得分
    }), {
        主动掌控对话节奏: 0,
        异议应对韧性: 0,
        决策推进与闭环: 0,
        量化价值呈现: 0,
        灵活应变能力: 0,
        情绪感染力: 0,
        销售士气综合得分: 0
    });

    const count = data.length;
    return {
        主动掌控对话节奏: sum.主动掌控对话节奏 / count,
        异议应对韧性: sum.异议应对韧性 / count,
        决策推进与闭环: sum.决策推进与闭环 / count,
        量化价值呈现: sum.量化价值呈现 / count,
        灵活应变能力: sum.灵活应变能力 / count,
        情绪感染力: sum.情绪感染力 / count,
        销售士气综合得分: sum.销售士气综合得分 / count,
        理由: ''
    };
}; 