import * as d3 from 'd3';

export interface TeamScore {
    城市: string;
    销售团队: string;
    主动掌控对话节奏: number;
    异议应对韧性: number;
    决策推进与闭环: number;
    量化价值呈现: number;
    灵活应变能力: number;
    情绪感染力: number;
    团队士气综合得分: number;
}

export interface CityTeamData {
    cityTeamMap: Map<string, Set<string>>;
    teamScores: TeamScore[];
}

export const loadTeamData = async (): Promise<CityTeamData> => {
    try {
        const data = await d3.csv('/data/processed_team_data.csv');
        
        // 创建城市-团队映射
        const cityTeamMap = new Map<string, Set<string>>();
        const teamScores: TeamScore[] = [];
        
        data.forEach(item => {
            const city = item.城市 || '';
            const team = item.销售团队 || '';
            
            if (city && team) {
                // 添加到城市-团队映射
                if (!cityTeamMap.has(city)) {
                    cityTeamMap.set(city, new Set<string>());
                }
                cityTeamMap.get(city)?.add(team);
                
                // 获取团队士气综合得分，处理可能有问题的字段名
                let score = 0;
                if (item['团队士气综合得分'] !== undefined) {
                    score = Number(item['团队士气综合得分']) || 0;
                } else if (item['团队士气综合\n得分'] !== undefined) {
                    score = Number(item['团队士气综合\n得分']) || 0;
                }
                
                // 确保数值在合理范围内
                if (isNaN(score) || score <= 0) {
                    score = 5; // 默认值，避免为0
                }
                
                // 添加到团队得分数组
                teamScores.push({
                    城市: city,
                    销售团队: team,
                    主动掌控对话节奏: Number(item.主动掌控对话节奏) || 0,
                    异议应对韧性: Number(item.异议应对韧性) || 0,
                    决策推进与闭环: Number(item.决策推进与闭环) || 0,
                    量化价值呈现: Number(item.量化价值呈现) || 0,
                    灵活应变能力: Number(item.灵活应变能力) || 0,
                    情绪感染力: Number(item.情绪感染力) || 0,
                    团队士气综合得分: score
                });
            }
        });

        console.log('Loaded team data with cities:', Array.from(cityTeamMap.keys()));
        console.log('Sample team scores:', teamScores.slice(0, 3));
        
        return { cityTeamMap, teamScores };
    } catch (error) {
        console.error('Error loading team data:', error);
        return { cityTeamMap: new Map(), teamScores: [] };
    }
};

export const calculateTeamAverages = (data: TeamScore[]): Omit<TeamScore, '城市' | '销售团队'> => {
    const dimensions = [
        '主动掌控对话节奏',
        '异议应对韧性',
        '决策推进与闭环',
        '量化价值呈现',
        '灵活应变能力',
        '情绪感染力'
    ] as const;

    const result = {} as Omit<TeamScore, '城市' | '销售团队'>;

    dimensions.forEach(dimension => {
        const validScores = data
            .filter(item => !isNaN(item[dimension]) && item[dimension] > 0)
            .map(item => item[dimension]);
        
        result[dimension] = validScores.length > 0
            ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
            : 0;
    });

    const validTotalScores = data
        .filter(item => !isNaN(item.团队士气综合得分) && item.团队士气综合得分 > 0)
        .map(item => item.团队士气综合得分);
    
    result.团队士气综合得分 = validTotalScores.length > 0
        ? validTotalScores.reduce((sum, score) => sum + score, 0) / validTotalScores.length
        : 0;

    return result;
}; 