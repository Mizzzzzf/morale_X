import React, { useEffect, useState, useMemo } from 'react';
import { Input, Empty, Button, Select, Space, Card, Spin, Tabs, Row, Col, Divider, Typography } from 'antd';
import { SearchOutlined, RollbackOutlined, PauseOutlined, CaretRightOutlined, SoundOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, RadarSeriesOption } from 'echarts';
import { loadSalesData, calculateAverageScores, type SalesScore } from '../utils/salesDataLoader';
import { getAIEvaluation } from '../utils/aiEvaluator';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadTeamData, calculateTeamAverages, TeamScore, CityTeamData } from '../utils/teamDataLoader';
import AudioPlayer from './AudioPlayer';
import useWindowSize from '../hooks/useWindowSize';

// 扩展销售数据类型，添加团队和城市字段
interface ExtendedSalesScore extends SalesScore {
    团队?: string;
    城市?: string;
}

const SalesAnalysis: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [teamData, setTeamData] = useState<CityTeamData>({ cityTeamMap: new Map(), teamScores: [] });
    const [salesData, setSalesData] = useState<ExtendedSalesScore[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedSales, setSelectedSales] = useState<string>('');
    const [data, setData] = useState<SalesScore | null>(null);
    const [averageScores, setAverageScores] = useState<SalesScore | null>(null);
    const [showEvaluation, setShowEvaluation] = useState<boolean | null>(null);
    const [evaluation, setEvaluation] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const { width: windowWidth } = useWindowSize();
    
    // 团队概览相关状态
    const [showTeamOverview, setShowTeamOverview] = useState(true);

    // 格式化时间
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    useEffect(() => {
        const init = async () => {
            const data = await loadSalesData();
            
            // 加载团队数据
            const loadedTeamData = await loadTeamData();
            setTeamData(loadedTeamData);
            
            // 从 URL 参数中获取城市和团队
            const params = new URLSearchParams(location.search);
            const city = params.get('city');
            const team = params.get('team');
            
            // 设置销售数据，使用 CSV 中的城市和团队信息
            setSalesData(data);
            
            // 如果有URL参数指定的城市和团队，设置选中状态
            if (city && team) {
                setSelectedCity(city);
                setSelectedTeam(team);
                
                // 如果是从团队页面跳转过来的，设置显示团队概览
                setShowTeamOverview(true);
            }
            
            // 计算平均分数并添加销售字段
            const avgScores = calculateAverageScores(data);
            setAverageScores({
                ...avgScores,
                销售: '平均值'
            });
        };
        init();
    }, [location]);

    const cities = useMemo(() => {
        return Array.from(teamData.cityTeamMap.keys()).sort();
    }, [teamData.cityTeamMap]);

    const teams = useMemo(() => {
        if (!selectedCity) return [];
        return Array.from(new Set(teamData.teamScores
            .filter(team => team.城市 === selectedCity)
            .map(team => team.销售团队))).sort();
    }, [teamData.teamScores, selectedCity]);

    const teamSalesData = useMemo(() => {
        if (!selectedCity || !selectedTeam) return [];
        // 获取选定团队的销售数据
        return salesData.filter(sale => {
            return sale.团队 === selectedTeam && sale.城市 === selectedCity;
        });
    }, [salesData, selectedCity, selectedTeam]);

    const handleSalesChange = async (value: string) => {
        setSelectedSales(value);
        setShowEvaluation(null);
        setEvaluation('');
    };

    const handleCityChange = (value: string) => {
        setSelectedCity(value);
        setSelectedTeam('');
    };

    const handleTeamChange = (value: string) => {
        setSelectedTeam(value);
        // 当团队变更时，清空已选择的销售
        setSelectedSales('');
        setShowEvaluation(null);
        setEvaluation('');
    };

    const handleEvaluationConfirm = async () => {
        setShowEvaluation(true);
        setLoading(true);
        
        const salesInfo = salesData.find(item => item.销售 === selectedSales);
        if (salesInfo) {
            try {
                const aiEvaluation = await getAIEvaluation(salesInfo);
                setEvaluation(aiEvaluation);
            } catch (error) {
                console.error('Error getting evaluation:', error);
                setEvaluation('无法获取评价');
            }
        }
        setLoading(false);
    };

    const handleEvaluationCancel = () => {
        setShowEvaluation(false);
    };

    const getRadarOption = (
        data: SalesScore | Omit<SalesScore, '销售'>,
        title: string,
        showPersonal: boolean
    ): EChartsOption => {
        const dimensions = [
            '主动掌控对话节奏',
            '异议应对韧性',
            '决策推进与闭环',
            '量化价值呈现',
            '灵活应变能力',
            '情绪感染力'
        ] as const;

        type DimensionKey = typeof dimensions[number];
        type ScoreFields = Omit<SalesScore, '销售' | '销售士气综合得分'>;
        type DimensionData = keyof ScoreFields;

        const option: EChartsOption = {
            title: {
                text: title,
                left: 'center',
                top: 30,
                textStyle: {
                    fontSize: 14
                }
            },
            legend: {
                data: ['全国均值', ...(showPersonal ? ['个人得分'] : [])],
                bottom: 0
            },
            radar: {
                indicator: dimensions.map(name => ({
                    name,
                    max: 10
                })),
                center: ['50%', '50%'],
                radius: '60%'
            },
            tooltip: {
                formatter: (params: any) => {
                    const seriesName = params.name;
                    let result = `<div style="font-weight:bold;margin-bottom:5px;">${seriesName}</div>`;
                    
                    params.value.forEach((val: number, index: number) => {
                        const dimName = dimensions[index];
                        result += `${dimName}: ${typeof val === 'number' ? val.toFixed(2) : val}<br>`;
                    });
                    
                    return result;
                }
            },
            series: [
            {
                type: 'radar',
                    data: [
                        {
                            value: dimensions.map(dim => {
                                const value = averageScores?.[dim as DimensionData] || 0;
                                return typeof value === 'number' ? parseFloat(value.toFixed(2)) : 0;
                            }),
                            name: '全国均值',
                            itemStyle: {
                                color: '#95de64'
                            },
                            areaStyle: {
                                color: 'rgba(149, 222, 100, 0.3)'
                            }
                        },
                        ...(showPersonal ? [
                            {
                                value: dimensions.map(dim => {
                                    const value = data[dim as DimensionData];
                                    return typeof value === 'number' ? parseFloat(value.toFixed(2)) : 0;
                                }),
                                name: '个人得分',
                                itemStyle: {
                                    color: '#ff7875'
                                },
                    areaStyle: {
                                    color: 'rgba(255, 120, 117, 0.3)'
                                }
                            }
                        ] : [])
                    ]
                }
            ]
        };

        return option;
    };

    const getTeamRadarOption = (teamData: TeamScore): EChartsOption => ({
        title: {
            text: `${teamData.销售团队}团队分析`,
            left: 'center',
            top: 30,
            textStyle: {
                fontSize: 14
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
                const seriesName = params.name;
                let result = `<div style="font-weight:bold;margin-bottom:5px;">${seriesName}</div>`;
                
                const dimensions = [
                    '主动掌控对话节奏',
                    '异议应对韧性',
                    '决策推进与闭环',
                    '量化价值呈现',
                    '灵活应变能力',
                    '情绪感染力'
                ];
                
                params.value.forEach((val: number, index: number) => {
                    const dimName = dimensions[index];
                    result += `${dimName}: ${typeof val === 'number' ? val.toFixed(2) : val}<br>`;
                });
                
                return result;
            }
        },
        radar: {
            indicator: [
                { name: '主动掌控对话节奏', max: 10 },
                { name: '异议应对韧性', max: 10 },
                { name: '决策推进与闭环', max: 10 },
                { name: '量化价值呈现', max: 10 },
                { name: '灵活应变能力', max: 10 },
                { name: '情绪感染力', max: 10 }
            ],
            radius: '60%',
            center: ['50%', '55%'],
            splitNumber: 5,
            splitArea: {
                areaStyle: {
                    color: ['rgba(255, 255, 255, 0.8)', 'rgba(245, 245, 245, 0.8)']
                }
            },
            axisName: {
                fontSize: 10,
                color: '#666',
                padding: [0, 0, 0, 0]
            },
            splitLine: {
                    lineStyle: {
                    color: 'rgba(200, 200, 200, 0.5)'
                }
            }
        },
        series: [{
                type: 'radar',
                data: [{
                value: [
                    parseFloat(teamData.主动掌控对话节奏.toFixed(2)),
                    parseFloat(teamData.异议应对韧性.toFixed(2)),
                    parseFloat(teamData.决策推进与闭环.toFixed(2)),
                    parseFloat(teamData.量化价值呈现.toFixed(2)),
                    parseFloat(teamData.灵活应变能力.toFixed(2)),
                    parseFloat(teamData.情绪感染力.toFixed(2))
                ],
                name: teamData.销售团队,
                    areaStyle: {
                    color: 'rgba(24, 144, 255, 0.2)'
                    },
                    lineStyle: {
                    color: 'rgba(24, 144, 255, 0.8)',
                    width: 2
                    },
                    itemStyle: {
                    color: 'rgba(24, 144, 255, 1)'
                },
                symbolSize: 5
            }]
        }]
    });

    const getBoxPlotOption = (): EChartsOption => {
        if (!selectedCity || !selectedTeam || teamSalesData.length === 0) {
            return {
                title: {
                    text: '暂无数据',
                    left: 'center',
                    top: 'center'
                }
            };
        }
        
        // 提取销售士气评分数据
        const salesScores = teamSalesData.map(sale => sale.销售士气综合得分);
        
        // 计算箱线图所需的统计数据
        const sortedScores = [...salesScores].sort((a, b) => a - b);
        const min = sortedScores[0];
        const max = sortedScores[sortedScores.length - 1];
        const q1 = sortedScores[Math.floor(sortedScores.length * 0.25)] || min;
        const median = sortedScores[Math.floor(sortedScores.length * 0.5)] || min;
        const q3 = sortedScores[Math.floor(sortedScores.length * 0.75)] || max;

        return {
            title: {
                text: `${selectedTeam}团队销售士气分布`,
                left: 'center',
                top: 30,
                textStyle: {
                    fontSize: 14
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    if (params.seriesIndex === 0) {
                        return `
                            <div>
                                <p>最小值: ${min.toFixed(2)}</p>
                                <p>Q1: ${q1.toFixed(2)}</p>
                                <p>中位数: ${median.toFixed(2)}</p>
                                <p>Q3: ${q3.toFixed(2)}</p>
                                <p>最大值: ${max.toFixed(2)}</p>
                            </div>
                        `;
                    } else {
                        return `${params.name}: ${params.value.toFixed(2)}`;
                    }
                }
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['销售士气评分'],
                boundaryGap: true,
                nameGap: 30,
                splitArea: {
                    show: false
                },
                axisLabel: {
                    formatter: '{value}'
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: '评分',
                min: 0,
                max: 10,
                splitArea: {
                    show: true
                },
                axisLabel: {
                    formatter: (value: number) => value.toFixed(2)
                }
            },
            series: [
                {
                    name: '箱线图',
                    type: 'boxplot',
                    data: [
                        [
                            parseFloat(min.toFixed(2)), 
                            parseFloat(q1.toFixed(2)), 
                            parseFloat(median.toFixed(2)), 
                            parseFloat(q3.toFixed(2)), 
                            parseFloat(max.toFixed(2))
                        ]
                    ],
                    itemStyle: {
                        color: '#1890ff',
                        borderColor: '#1890ff'
                    }
                },
                {
                    name: '销售评分',
                    type: 'scatter',
                    data: teamSalesData.map(sale => ({
                        name: sale.销售,
                        value: parseFloat(sale.销售士气综合得分.toFixed(2)),
                        itemStyle: {
                            color: '#ff7875'
                        }
                    })),
                    symbolSize: 8
                }
            ]
        };
    };

    // 处理条形图点击事件
    const handleBarClick = (params: any) => {
        const salesName = params.data.name;
        const salesData = teamSalesData.find(s => s.销售 === salesName);
        
        if (salesData) {
            setSelectedSales(salesName);
            setData(salesData);
        }
    };

    // 修改图例点击事件处理
    const handleLegendClick = (saleName: string) => {
        setSelectedSales(saleName);
        setData(teamSalesData.find(s => s.销售 === saleName) || null);
        setEvaluation('');
    };

    // 修改 SalesLegend 组件，确保只显示当前团队的销售
    const SalesLegend = () => {
        // 按士气评分降序排列销售
        const sortedSales = [...teamSalesData].sort((a, b) => b.销售士气综合得分 - a.销售士气综合得分);
        
        return (
            <div style={{ 
                padding: '10px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                backgroundColor: '#fff',
                marginTop: '16px',
                maxHeight: '300px',
                overflow: 'auto'
            }}>
                <h4 style={{ textAlign: 'center', marginBottom: '12px' }}>销售士气排名</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {sortedSales.map((sale, index) => (
                        <li 
                            key={sale.销售}
                            onClick={() => handleLegendClick(sale.销售)}
                            style={{
                                padding: '8px 12px',
                                marginBottom: '4px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedSales === sale.销售 ? '#e6f7ff' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = selectedSales === sale.销售 ? '#e6f7ff' : 'transparent';
                            }}
                        >
                            <span>
                                <span style={{ 
                                    display: 'inline-block', 
                                    width: '20px', 
                                    height: '20px', 
                                    borderRadius: '50%', 
                                    backgroundColor: '#ff7875',
                                    marginRight: '8px',
                                    verticalAlign: 'middle'
                                }}></span>
                                <span style={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>
                                    {index < 3 && <span style={{ 
                                        color: ['gold', 'silver', '#cd7f32'][index],
                                        marginRight: '4px'
                                    }}>
                                        {['🥇', '🥈', '🥉'][index]}
                                    </span>}
                                    {sale.销售}
                                </span>
                            </span>
                            <span style={{ 
                                fontWeight: 'bold',
                                color: sale.销售士气综合得分 >= 9 ? 'rgba(138, 43, 226, 0.9)' : 
                                       sale.销售士气综合得分 >= 8 ? 'rgba(65, 105, 225, 0.9)' :
                                       sale.销售士气综合得分 >= 7 ? 'rgba(60, 179, 113, 0.9)' :
                                       'rgba(220, 20, 60, 0.9)'
                            }}>
                                {sale.销售士气综合得分.toFixed(2)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const renderTeamOverview = () => {
        if (!selectedCity || !selectedTeam) {
            return (
                <Empty
                    description="请选择城市和团队"
                    style={{ marginTop: '48px' }}
                />
            );
        }

        const teamInfo = teamData.teamScores.find(team => 
            team.销售团队 === selectedTeam && team.城市 === selectedCity
        );

        if (!teamInfo) {
            return (
                <Empty
                    description="未找到团队数据"
                    style={{ marginTop: '48px' }}
                />
            );
        }

        // 根据评分设置不同的颜色
        let scoreColor;
        const score = teamInfo.团队士气综合得分;
        if (score >= 9) {
            scoreColor = 'rgba(138, 43, 226, 0.9)'; // 紫色 - 高分
        } else if (score >= 8) {
            scoreColor = 'rgba(65, 105, 225, 0.9)'; // 蓝色 - 中高分
        } else if (score >= 7) {
            scoreColor = 'rgba(60, 179, 113, 0.9)'; // 绿色 - 中分
        } else {
            scoreColor = 'rgba(220, 20, 60, 0.9)'; // 红色 - 低分
        }

        return (
            <div style={{ display: 'flex', gap: '20px' }}>
                {/* 左侧箱线图 - 40% */}
                <div style={{ flex: '0 0 40%' }}>
                    <ReactECharts
                        option={getBoxPlotOption()}
                        style={{ height: '400px' }}
                    />
                </div>
                
                {/* 中间雷达图 - 30% */}
                <div style={{ 
                    flex: windowWidth <= 768 ? '1 1 100%' : '1 1 calc(33.333% - 16px)',
                    backgroundColor: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    minWidth: windowWidth <= 768 ? '100%' : '300px',
                    marginTop: windowWidth <= 768 ? '16px' : '0',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '18px', padding: '10px'}}>
                        {selectedSales ? `${selectedSales}的士气雷达图` : '团队士气雷达图'}
                    </h3>
                    {selectedSales && data ? (
                        // 如果选择了销售，显示销售的雷达图
                        <>
                    <ReactECharts
                                option={getRadarOption(
                                    data,
                                    `${data.销售}的士气分析`,
                                    true
                                )} 
                                style={{ height: '300px' }}
                            />
                            {/* 销售评分信息 */}
                            <div style={{
                                marginTop: '60px',
                                padding: '30px',
                                borderTop: '1px solid #f0f0f0'
                            }}>
                                <div style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'center' }}>
                                    销售士气综合评分
                </div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: data.销售士气综合得分 >= 9 ? 'rgba(138, 43, 226, 0.9)' : 
                                          data.销售士气综合得分 >= 7 ? 'rgba(65, 105, 225, 0.9)' :
                                          data.销售士气综合得分 >= 6 ? 'rgba(223, 223, 64, 0.9)' :
                                          'rgba(220, 20, 60, 0.9)',
                                    marginBottom: '10px',
                                    textAlign: 'center'
                                }}>
                                    {data.销售士气综合得分.toFixed(2)}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-around',
                                    fontSize: '14px',
                                    color: '#666'
                                }}>
                                    <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                        <div>主动掌控对话节奏</div>
                                        <div style={{ fontWeight: 'bold' }}>{data.主动掌控对话节奏.toFixed(2)}</div>
                                    </div>
                                    <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                        <div>异议应对韧性</div>
                                        <div style={{ fontWeight: 'bold' }}>{data.异议应对韧性.toFixed(2)}</div>
                                    </div>
                                    <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                        <div>决策推进与闭环</div>
                                        <div style={{ fontWeight: 'bold' }}>{data.决策推进与闭环.toFixed(2)}</div>
                                    </div>
                                    <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                        <div>量化价值呈现</div>
                                        <div style={{ fontWeight: 'bold' }}>{data.量化价值呈现.toFixed(2)}</div>
                                    </div>
                                    <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                        <div>灵活应变能力</div>
                                        <div style={{ fontWeight: 'bold' }}>{data.灵活应变能力.toFixed(2)}</div>
                                    </div>
                                    <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                        <div>情绪感染力</div>
                                        <div style={{ fontWeight: 'bold' }}>{data.情绪感染力.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : teamData.teamScores.find(team => team.销售团队 === selectedTeam && team.城市 === selectedCity) ? (
                        // 否则显示团队的雷达图和团队评分
                        <>
                            <ReactECharts
                                option={getTeamRadarOption(teamData.teamScores.find(team => 
                                    team.销售团队 === selectedTeam && team.城市 === selectedCity
                                )!)}
                                style={{ height: '350px' }}
                            />
                            {/* 团队评分信息 */}
                            {(() => {
                                const teamInfo = teamData.teamScores.find(team => 
                                    team.销售团队 === selectedTeam && team.城市 === selectedCity
                                );
                                
                                if (!teamInfo) return null;
                                
                                // 根据评分设置不同的颜色
                                let scoreColor;
                                const score = teamInfo.团队士气综合得分;
                                if (score >= 9) {
                                    scoreColor = 'rgba(138, 43, 226, 0.9)'; // 紫色 - 高分
                                } else if (score >= 7) {
                                    scoreColor = 'rgba(65, 105, 225, 0.9)'; // 蓝色 - 中高分
                                } else if (score >= 6) {
                                    scoreColor = 'rgba(200, 220, 70, 0.9)'; // 绿色 - 中分
                                } else {
                                    scoreColor = 'rgba(220, 20, 60, 0.9)'; // 红色 - 低分
                                }
                                
                                return (
                    <div style={{
                                        marginTop: '50px',
                                        padding: '10px',
                                        borderTop: '1px solid #f0f0f0'
                                    }}>
                                        <div style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'center' }}>
                            团队综合士气评分
                        </div>
                        <div style={{
                                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: scoreColor,
                                            marginBottom: '20px',
                                            textAlign: 'center'
                        }}>
                            {teamInfo.团队士气综合得分.toFixed(2)}
                        </div>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-around',
                                            fontSize: '14px',
                            color: '#666'
                        }}>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>主动掌控对话节奏</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.主动掌控对话节奏.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>异议应对韧性</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.异议应对韧性.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>决策推进与闭环</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.决策推进与闭环.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>量化价值呈现</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.量化价值呈现.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>灵活应变能力</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.灵活应变能力.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>情绪感染力</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.情绪感染力.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <Empty description="暂无团队数据" style={{ margin: 'auto' }} />
                    )}
                </div>

                {/* 右侧销售士气评价区域 - 右侧33% */}
                <div style={{ 
                    flex: windowWidth <= 768 ? '1 1 100%' : '1 1 calc(33.333% - 16px)',
                    backgroundColor: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    minWidth: windowWidth <= 768 ? '100%' : '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: windowWidth <= 768 ? '16px' : '0',
                    minHeight: '400px'
                }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>
                        {selectedSales ? '销售士气评价' : '团队士气评价'}
                    </h3>
                    {selectedSales && data ? (
                        // 显示选中销售的评价
                        showEvaluation === null ? (
                            <div style={{ margin: 'auto', textAlign: 'center' }}>
                                <p style={{ marginBottom: '16px' }}>
                                    请问是否生成销售士气评价与建议？
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                                    <Button type="primary" onClick={handleEvaluationConfirm}>
                                        是的
                                    </Button>
                                    <Button onClick={handleEvaluationCancel}>
                                        暂时不需要
                                    </Button>
                                </div>
                            </div>
                        ) : showEvaluation ? (
                            loading ? (
                                <div style={{ textAlign: 'center', padding: '20px', margin: 'auto' }}>
                                    <Spin />
                                </div>
                            ) : (
                                <div style={{ 
                                    whiteSpace: 'pre-line', 
                                    overflow: 'auto',
                                    flex: 1,
                                    padding: '15px',
                                    fontSize: '16px'
                                }}>
                                    {evaluation}
                                    <AudioPlayer audioSrc="/low_morale_example.wav" />
                                </div>
                            )
                        ) : (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                height: '100%',
                                color: '#999'
                            }}>
                                <div style={{ fontSize: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                    点击下方按钮生成销售士气评价与建议
                                </div>
                                <Button type="primary" onClick={handleEvaluationConfirm}>
                                    生成士气评价与建议
                                </Button>
                            </div>
                        )
                    ) : (
                        // 未选择销售时，右侧显示空白或提示信息
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            height: '100%',
                            color: '#999'
                        }}>
                            <div style={{ fontSize: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                请从左侧选择一名销售以查看详细评价
                            </div>
                            <div style={{ fontSize: '14px', textAlign: 'center' }}>
                                点击左侧条形图或销售排名列表中的销售名称
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 获取团队条形图选项
    const getTeamBarOption = (): EChartsOption => {
        if (!selectedCity || !selectedTeam || teamSalesData.length === 0) {
            return {
                title: {
                    text: '暂无数据',
                    left: 'center',
                    top: 'center'
                }
            };
        }
        
        // 按销售士气评分降序排列销售
        const sortedSales = [...teamSalesData].sort((a, b) => b.销售士气综合得分 - a.销售士气综合得分);
        
        // 反转数组，使得条形图从上到下是升序排列
        const reversedSales = [...sortedSales].reverse();
        
        return {
            title: {
                text: `${selectedTeam}销售士气分布`,
                left: 'center',
                top: 10,
                textStyle: {
                    fontSize: 18
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    const data = params[0].data;
                    return `${data.name}<br/>士气评分：${data.value.toFixed(2)}`;
                }
            },
            grid: {
                left: '5%',
                right: '15%',
                bottom: '5%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '销售士气评分',
                min: 0,
                max: 10,
                axisLabel: {
                    formatter: (value: number) => value.toFixed(2)
                },
                splitLine: {
                    lineStyle: {
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'category',
                data: reversedSales.map(sale => sale.销售),
                axisLabel: {
                    interval: 0,
                    fontSize: 12,
                    width: 120,
                    overflow: 'truncate'
                }
            },
            series: [{
                name: '销售士气',
                type: 'bar',
                data: reversedSales.map(sale => ({
                    name: sale.销售,
                    value: parseFloat(sale.销售士气综合得分.toFixed(2))
                })),
                barWidth: '80%',
                barGap: '10%',
                itemStyle: {
                    color: function(params: any) {
                        const value = params.data.value;
                        // 根据评分设置不同的颜色
                        if (value >= 9) {
                            return 'rgba(138, 43, 226, 0.7)'; // 紫色 - 高分
                        } else if (value >= 7) {
                            return 'rgba(65, 105, 225, 0.7)'; // 蓝色 - 中高分
                        } else if (value >= 6) {
                            return 'rgba(228, 223, 66, 0.7)'; // 绿色 - 中分
                        } else {
                            return 'rgba(220, 20, 60, 0.7)'; // 红色 - 低分
                        }
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: (params: any) => {
                        return params.data.value.toFixed(2);
                    },
                    fontSize: 12,
                    fontWeight: 'bold'
                }
            }]
        };
    };

    // 计算图表高度
    const getChartHeight = () => {
        const baseHeight = 400;
        const itemHeight = 30; // 每个销售项的高度
        
        if (!teamSalesData.length) return `${baseHeight}px`;
        
        // 根据销售数量调整高度，确保有足够的空间显示所有销售
        const calculatedHeight = Math.max(baseHeight, teamSalesData.length * itemHeight + 100);
        
        // 限制最大高度
        return `${Math.min(calculatedHeight, 800)}px`;
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* 城市和团队选择区域 */}
            <div style={{ marginBottom: '24px', display: 'flex' }}>
                <Space>
                    <Select
                        placeholder="选择城市"
                        style={{ width: 200 }}
                        value={selectedCity || undefined}
                        onChange={handleCityChange}
                        options={cities.map(city => ({ label: city, value: city }))}
                    />
                    {selectedCity && (
                        <Select
                            placeholder="选择团队"
                            style={{ width: 200 }}
                            value={selectedTeam || undefined}
                            onChange={handleTeamChange}
                            options={teams.map(team => ({ label: team, value: team }))}
                        />
                    )}
                </Space>
            </div>
            
            {/* 团队销售分析区域 */}
            {selectedCity && selectedTeam && teamSalesData.length > 0 ? (
                <div style={{ 
                    display: 'flex', 
                    gap: '24px',
                    flexWrap: 'wrap',
                    flexDirection: windowWidth <= 768 ? 'column' : 'row'
                }}>
                    {/* 销售条形图区域 - 左侧33% */}
                    <div style={{ 
                        flex: windowWidth <= 768 ? '1 1 100%' : '1 1 calc(33.333% - 16px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        minWidth: windowWidth <= 768 ? '100%' : '300px'
                    }}>
                        {/* 条形图 */}
                        <div style={{ 
                            backgroundColor: '#fff',
                            padding: '24px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            flex: '1 1 auto',
                            minHeight: '400px'
                        }}>
                            <ReactECharts
                                option={getTeamBarOption()}
                                style={{ height: getChartHeight() }}
                                onEvents={{
                                    'click': handleBarClick
                                }}
                            />
                        </div>
                        
                        {/* 销售排名区域 */}
                        <div style={{ 
                            flex: '0 0 auto',
                            backgroundColor: '#fff',
                            padding: '16px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            minHeight: '200px',
                            maxHeight: windowWidth <= 768 ? '300px' : '300px',
                            overflow: 'auto'
                        }}>
                            <SalesLegend />
                        </div>
                    </div>
                    
                    {/* 雷达图分析区域 - 中间33% */}
                    <div style={{ 
                        flex: windowWidth <= 768 ? '1 1 100%' : '1 1 calc(33.333% - 16px)',
                        backgroundColor: '#fff',
                        padding: '12px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        minWidth: windowWidth <= 768 ? '100%' : '300px',
                        marginTop: windowWidth <= 768 ? '16px' : '0',
                        minHeight: '360px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '18px' }}>
                            {selectedSales ? `${selectedSales}的士气雷达图` : '团队士气雷达图'}
                        </h3>
                        {selectedSales && data ? (
                            // 如果选择了销售，显示销售的雷达图
                            <>
                                <ReactECharts
                                    option={getRadarOption(
                                        data,
                                        `${data.销售}的士气分析`,
                                        true
                                    )} 
                                    style={{ height: '400px' }}
                                />
                                {/* 销售评分信息 */}
                                <div style={{
                                    marginTop: '40px',
                                    padding: '10px',
                                    borderTop: '1px solid #f0f0f0'
                                }}>
                                    <div style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'center' }}>
                                        销售士气综合评分
                                    </div>
                                    <div style={{
                                        fontSize: '25px',
                                        fontWeight: 'bold',
                                        color: data.销售士气综合得分 >= 9 ? 'rgba(138, 43, 226, 0.9)' : 
                                              data.销售士气综合得分 >= 7 ? 'rgba(65, 105, 225, 0.9)' :
                                              data.销售士气综合得分 >= 6 ? 'rgba(223, 223, 64, 0.9)' :
                                              'rgba(220, 20, 60, 0.9)',
                                        marginBottom: '10px',
                                        textAlign: 'center'
                                    }}>
                                        {data.销售士气综合得分.toFixed(2)}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-around',
                                        fontSize: '14px',
                                        color: '#666'
                                    }}>
                                        <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                            <div>主动掌控对话节奏</div>
                                            <div style={{ fontWeight: 'bold' }}>{data.主动掌控对话节奏.toFixed(2)}</div>
                                        </div>
                                        <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                            <div>异议应对韧性</div>
                                            <div style={{ fontWeight: 'bold' }}>{data.异议应对韧性.toFixed(2)}</div>
                                        </div>
                                        <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                            <div>决策推进与闭环</div>
                                            <div style={{ fontWeight: 'bold' }}>{data.决策推进与闭环.toFixed(2)}</div>
                                        </div>
                                        <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                            <div>量化价值呈现</div>
                                            <div style={{ fontWeight: 'bold' }}>{data.量化价值呈现.toFixed(2)}</div>
                                        </div>
                                        <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                            <div>灵活应变能力</div>
                                            <div style={{ fontWeight: 'bold' }}>{data.灵活应变能力.toFixed(2)}</div>
                                        </div>
                                        <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                            <div>情绪感染力</div>
                                            <div style={{ fontWeight: 'bold' }}>{data.情绪感染力.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : teamData.teamScores.find(team => team.销售团队 === selectedTeam && team.城市 === selectedCity) ? (
                            // 否则显示团队的雷达图和团队评分
                            <>
                                <ReactECharts
                                    option={getTeamRadarOption(teamData.teamScores.find(team => 
                                        team.销售团队 === selectedTeam && team.城市 === selectedCity
                                    )!)}
                                    style={{ height: '350px' }}
                                />
                                {/* 团队评分信息 */}
                                {(() => {
                                    const teamInfo = teamData.teamScores.find(team => 
                                        team.销售团队 === selectedTeam && team.城市 === selectedCity
                                    );
                                    
                                    if (!teamInfo) return null;
                                    
                                    // 根据评分设置不同的颜色
                                    let scoreColor;
                                    const score = teamInfo.团队士气综合得分;
                                    if (score >= 9) {
                                        scoreColor = 'rgba(138, 43, 226, 0.9)'; // 紫色 - 高分
                                    } else if (score >= 7) {
                                        scoreColor = 'rgba(65, 105, 225, 0.9)'; // 蓝色 - 中高分
                                    } else if (score >= 6) {
                                        scoreColor = 'rgba(200, 220, 70, 0.9)'; // 绿色 - 中分
                                    } else {
                                        scoreColor = 'rgba(220, 20, 60, 0.9)'; // 红色 - 低分
                                    }
                                    
                                    return (
                    <div style={{
                                        marginTop: '40px',
                                        padding: '10px',
                                        borderTop: '1px solid #f0f0f0'
                                    }}>
                                        <div style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'center' }}>
                            团队综合士气评分
                        </div>
                        <div style={{
                                            fontSize: '25px',
                            fontWeight: 'bold',
                            color: scoreColor,
                                            marginBottom: '20px',
                                            textAlign: 'center'
                        }}>
                            {teamInfo.团队士气综合得分.toFixed(2)}
                        </div>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-around',
                                            fontSize: '14px',
                            color: '#666'
                        }}>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>主动掌控对话节奏</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.主动掌控对话节奏.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>异议应对韧性</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.异议应对韧性.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>决策推进与闭环</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.决策推进与闭环.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>量化价值呈现</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.量化价值呈现.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>灵活应变能力</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.灵活应变能力.toFixed(2)}</div>
                            </div>
                                            <div style={{ width: '50%', marginBottom: '15px' ,textAlign: 'center'}}>
                                <div>情绪感染力</div>
                                <div style={{ fontWeight: 'bold' }}>{teamInfo.情绪感染力.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <Empty description="暂无团队数据" style={{ margin: 'auto' }} />
                    )}
                </div>

                {/* 销售士气评价区域 - 右侧33% */}
                <div style={{ 
                    flex: windowWidth <= 768 ? '1 1 100%' : '1 1 calc(33.333% - 16px)',
                    backgroundColor: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    minWidth: windowWidth <= 768 ? '100%' : '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: windowWidth <= 768 ? '16px' : '0',
                    minHeight: '400px'
                }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '18px' }}>
                        {selectedSales ? '销售士气评价' : '团队士气评价'}
                    </h3>
                    {selectedSales && data ? (
                        // 显示选中销售的评价
                        showEvaluation === null ? (
                            <div style={{ margin: 'auto', textAlign: 'center' }}>
                                <p style={{ marginBottom: '16px' }}>
                                    请问是否生成销售士气评价与建议？
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                                    <Button type="primary" onClick={handleEvaluationConfirm}>
                                        是的
                                    </Button>
                                    <Button onClick={handleEvaluationCancel}>
                                        暂时不需要
                                    </Button>
                                </div>
                            </div>
                        ) : showEvaluation ? (
                            loading ? (
                                <div style={{ textAlign: 'center', padding: '20px', margin: 'auto' }}>
                                    <Spin />
                                </div>
                            ) : (
                                <div style={{ 
                                    whiteSpace: 'pre-line', 
                                    overflow: 'auto',
                                    flex: 1,
                                    padding: '15px',
                                    fontSize: '16px'
                                }}>
                                    {evaluation}
                                    <AudioPlayer audioSrc="/low_morale_example.wav" />
                                </div>
                            )
                        ) : (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                height: '100%',
                                color: '#999'
                            }}>
                                <div style={{ fontSize: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                    点击下方按钮生成销售士气评价与建议
                                </div>
                                <Button type="primary" onClick={handleEvaluationConfirm}>
                                    生成士气评价与建议
                                </Button>
                            </div>
                        )
                    ) : (
                        // 未选择销售时，右侧显示空白或提示信息
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            height: '100%',
                            color: '#999'
                        }}>
                            <div style={{ fontSize: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                请从左侧选择一名销售以查看详细评价
                            </div>
                            <div style={{ fontSize: '14px', textAlign: 'center' }}>
                                点击左侧条形图或销售排名列表中的销售名称
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <Empty
                description={
                    !selectedCity 
                        ? "请选择城市" 
                        : !selectedTeam 
                            ? "请选择团队" 
                            : "暂无团队销售数据"
                }
                style={{ marginTop: '48px' }}
            />
        )}
    </div>
);
};

export default SalesAnalysis;