import React, { useEffect, useState, useMemo } from 'react';
import { Select, Space } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadTeamData, calculateTeamAverages, TeamScore, CityTeamData } from '../utils/teamDataLoader';
import { loadSalesData, SalesScore } from '../utils/salesDataLoader';
import useWindowSize from '../hooks/useWindowSize';

const TeamAnalysis: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState<CityTeamData>({ cityTeamMap: new Map(), teamScores: [] });
    const [salesData, setSalesData] = useState<SalesScore[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const { width: windowWidth } = useWindowSize();

    useEffect(() => {
        const init = async () => {
            const loadedData = await loadTeamData();
            setData(loadedData);
            
            // 加载销售数据，用于箱线图
            const loadedSalesData = await loadSalesData();
            setSalesData(loadedSalesData);
            
            // 从 URL 参数中获取城市
            const params = new URLSearchParams(location.search);
            const city = params.get('city');
            if (city) {
                setSelectedCity(city);
            }
        };
        init();
    }, [location]);

    const cities = useMemo(() => {
        return Array.from(data.cityTeamMap.keys()).sort();
    }, [data.cityTeamMap]);

    const teams = useMemo(() => {
        if (!selectedCity) return [];
        return Array.from(data.cityTeamMap.get(selectedCity) || []).sort();
    }, [data.cityTeamMap, selectedCity]);

    const cityTeams = useMemo(() => {
        if (!selectedCity) return [];
        console.log('Selected city:', selectedCity);
        const teamsForCity = data.teamScores.filter(team => team.城市 === selectedCity);
        // 按团队士气降序排列
        teamsForCity.sort((a, b) => b.团队士气综合得分 - a.团队士气综合得分);
        console.log('Teams for city (sorted):', teamsForCity);
        return teamsForCity;
    }, [data.teamScores, selectedCity]);

    const getBarOption = (): EChartsOption => {
        // 确保团队按士气评分降序排列
        const sortedTeams = [...cityTeams].sort((a, b) => b.团队士气综合得分 - a.团队士气综合得分);
        
        // 反转数组，使得条形图从上到下是升序排列
        const reversedTeams = [...sortedTeams].reverse();
        
        return {
            title: {
                text: `${selectedCity}团队士气分布`,
                left: 'center',
                top: 20,
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
                left: '15%',
                right: '15%',
                bottom: '5%', // 增加底部边距
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '团队士气评分',
                min: 0,
                max: 10,
                splitLine: {
                    lineStyle: {
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'category',
                data: reversedTeams.map(team => team.销售团队),
                axisLabel: {
                    interval: 0,
                    fontSize: 12,
                    width: 120,
                    overflow: 'truncate'
                }
            },
            series: [{
                name: '团队士气',
                type: 'bar',
                data: reversedTeams.map(team => ({
                    name: team.销售团队,
                    value: team.团队士气综合得分
                })),
                barWidth: '80%', // 增加条形宽度
                barGap: '10%', // 保持间隙不变
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

    const getRadarOption = (teamData: TeamScore): EChartsOption => ({
            title: {
            text: `${teamData.销售团队}团队分析`,
            left: 'center',
            top: windowWidth <= 768 ? 5 : 10, // 调整标题位置更靠上
            textStyle: {
                fontSize: windowWidth <= 768 ? 16 : 18
            }
        },
        tooltip: {
            trigger: 'item'
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
            radius: windowWidth <= 768 ? '55%' : '60%', // 调整雷达图半径
            center: ['50%', '50%'], // 调整雷达图位置更靠上
            splitNumber: 5,
            splitArea: {
                areaStyle: {
                    color: ['rgba(255, 255, 255, 0.8)', 'rgba(245, 245, 245, 0.8)']
                }
            },
            axisName: {
                fontSize: windowWidth <= 768 ? 11 : 13,
                color: '#666',
                padding: [0, 0, 0, 0]
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(200, 200, 200, 0.5)'
                }
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(200, 200, 200, 0.8)'
                }
            }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [
                    teamData.主动掌控对话节奏,
                    teamData.异议应对韧性,
                    teamData.决策推进与闭环,
                    teamData.量化价值呈现,
                    teamData.灵活应变能力,
                    teamData.情绪感染力
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

    const handleCityChange = (value: string) => {
        setSelectedCity(value);
        setSelectedTeam('');
        navigate(`/team?city=${value}`);
    };

    const handleBarClick = (params: any) => {
        console.log('Bar clicked:', params);
        const teamName = params.data.name;
        
        console.log('Selected team:', teamName);
        
        if (teamName) {
            setSelectedTeam(teamName);
        }
    };

    // 计算图表高度，根据团队数量动态调整
    const getChartHeight = () => {
        if (!cityTeams.length) return '400px';
        // 固定高度，因为现在是单个箱线图
        return '400px';
    };

    // 获取箱线图选项
    const getBoxPlotOption = (): EChartsOption => {
        if (!selectedCity || cityTeams.length === 0) {
            return {
                title: {
                    text: '暂无数据',
                    left: 'center',
                    top: 'center'
                }
            };
        }
        
        // 获取所选城市的所有团队的士气评分
        const teamScores = cityTeams.map(team => team.团队士气综合得分);
        
        // 计算箱线图所需的统计数据
        const sortedScores = [...teamScores].sort((a, b) => a - b);
        const min = sortedScores[0];
        const max = sortedScores[sortedScores.length - 1];
        const q1 = sortedScores[Math.floor(sortedScores.length * 0.25)] || min;
        const median = sortedScores[Math.floor(sortedScores.length * 0.5)] || min;
        const q3 = sortedScores[Math.floor(sortedScores.length * 0.75)] || max;
        
        return {
            title: {
                text: `${selectedCity}团队士气分布`,
                left: 'center',
                top: windowWidth <= 768 ? 10 : 20,
                textStyle: {
                    fontSize: windowWidth <= 768 ? 16 : 18
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    if (params.seriesIndex === 0) {
                        return `
                            <div style="padding: 5px;">
                                <div style="font-weight: bold; margin-bottom: 5px;">${selectedCity}团队士气分布</div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>最小值:</span>
                                    <span style="font-weight: bold;">${min.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>Q1:</span>
                                    <span style="font-weight: bold;">${q1.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>中位数:</span>
                                    <span style="font-weight: bold;">${median.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                    <span>Q3:</span>
                                    <span style="font-weight: bold;">${q3.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>最大值:</span>
                                    <span style="font-weight: bold;">${max.toFixed(2)}</span>
                                </div>
                            </div>
                        `;
                    } else if (params.seriesIndex === 1) {
                        const teamName = params.name;
                        const score = params.value;
                        return `
                            <div style="padding: 5px;">
                                <div style="font-weight: bold; margin-bottom: 5px;">团队: ${teamName}</div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>士气评分:</span>
                                    <span style="font-weight: bold; color: ${getTeamColor(score)}">${score.toFixed(2)}</span>
                                </div>
                            </div>
                        `;
                    }
                    return '';
                },
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#ccc',
                borderWidth: 1,
                textStyle: {
                    color: '#333'
                },
                extraCssText: 'box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);'
            },
            grid: {
                left: windowWidth <= 768 ? '10%' : '15%',
                right: windowWidth <= 768 ? '10%' : '15%',
                bottom: '10%',
                top: windowWidth <= 768 ? '20%' : '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['团队士气评分'],
                boundaryGap: true,
                nameGap: 30,
                splitArea: {
                    show: false
                },
                axisLabel: {
                    formatter: '{value}',
                    fontSize: windowWidth <= 768 ? 10 : 12
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: '评分',
                min: 5,
                max: 9.5,
                splitArea: {
                    show: true
                },
                axisLabel: {
                    fontSize: windowWidth <= 768 ? 10 : 12
                }
            },
            series: [
                {
                    name: '箱线图',
                    type: 'boxplot',
                    data: [
                        [min, q1, median, q3, max]
                    ],
                    itemStyle: {
                        color: 'rgba(24, 144, 255, 0.4)',
                        borderColor: 'rgba(24, 144, 255, 0.8)',
                        borderWidth: 2
                    },
                    emphasis: {
                        itemStyle: {
                            borderWidth: 3,
                            shadowBlur: 5,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        }
                    }
                },
                {
                    name: '团队评分',
                    type: 'scatter',
                    data: cityTeams.map(team => ({
                        name: team.销售团队,
                        value: team.团队士气综合得分,
                        itemStyle: {
                            color: getTeamColor(team.团队士气综合得分),
                            borderColor: '#fff',
                            borderWidth: 0.5,
                            shadowBlur: 3,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        }
                    })),
                    symbolSize: 12,
                    label: {
                        show: false,
                        position: 'right',
                        formatter: (params: any) => {
                            return params.name;
                        },
                        fontSize: 12
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: '#fff',
                            borderWidth: 3,
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        },
                        scale: true
                    }
                }
            ]
        };
    };

    // 团队士气排名组件
    const TeamRanking = () => {
        // 按士气评分降序排列团队
        const sortedTeams = [...cityTeams].sort((a, b) => b.团队士气综合得分 - a.团队士气综合得分);
        
        return (
            <div style={{ 
                padding: '10px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                backgroundColor: '#fff',
                height: '100%',
                overflow: 'auto'
            }}>
                <h4 style={{ textAlign: 'center', marginBottom: '12px' }}>团队士气排名</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {sortedTeams.map((team, index) => (
                        <li 
                            key={team.销售团队}
                            onClick={() => handleBarClick({ data: { name: team.销售团队 } })}
                            style={{
                                padding: '8px 12px',
                                marginBottom: '4px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedTeam === team.销售团队 ? '#e6f7ff' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = selectedTeam === team.销售团队 ? '#e6f7ff' : 'transparent';
                            }}
                        >
                            <span>
                                <span style={{ 
                                    display: 'inline-block', 
                                    width: '16px', 
                                    height: '16px', 
                                    borderRadius: '50%', 
                                    backgroundColor: getTeamColor(team.团队士气综合得分),
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
                                    {team.销售团队}
                                </span>
                            </span>
                            <span style={{ 
                                fontWeight: 'bold',
                                color: getTeamColor(team.团队士气综合得分)
                            }}>
                                {team.团队士气综合得分.toFixed(2)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    // 获取团队颜色
    const getTeamColor = (score: number) => {
        if (score >= 9) {
            return 'rgba(138, 43, 226, 0.7)'; // 紫色 - 高分
        } else if (score >= 7) {
            return 'rgba(65, 105, 225, 0.7)'; // 蓝色 - 中高分
        } else if (score >= 6) {
            return 'rgba(228, 223, 66, 0.7)'; // 绿色 - 中分
        } else {
            return 'rgba(220, 20, 60, 0.7)'; // 红色 - 低分
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <Space>
                    <Select
                        placeholder="选择城市"
                        style={{ width: 200 }}
                        value={selectedCity || undefined}
                        onChange={handleCityChange}
                        options={cities.map(city => ({ label: city, value: city }))}
                    />
                </Space>
            </div>
            
            <div style={{ 
                display: 'flex', 
                gap: windowWidth <= 768 ? '16px' : '24px',
                transition: 'all 0.3s ease',
                minHeight: '600px',
                flexWrap: 'wrap',
                flexDirection: windowWidth <= 768 ? 'column' : 'row',
                width: '100%',
                justifyContent: 'space-between'
            }}>
                {/* 左侧区域：团队箱线图和团队士气排名 */}
                <div style={{ 
                    width: windowWidth <= 768 ? '100%' : 'calc(50% - 12px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    minWidth: windowWidth <= 768 ? '100%' : '300px'
                }}>
                    {/* 团队箱线图 */}
                    <div style={{ 
                        backgroundColor: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        overflow: 'auto',
                        flex: '1 1 auto',
                        height: '500px'
                    }}>
                        {selectedCity && cityTeams.length > 0 ? (
                            <ReactECharts
                                option={getBoxPlotOption()}
                                style={{ height: getChartHeight() }}
                                onEvents={{
                                    'click': (params: any) => {
                                        if (params.componentType === 'yAxis') {
                                            handleBarClick({ data: { name: params.value } });
                                        } else if (params.seriesIndex === 1) {
                                            // 点击散点图上的点
                                            handleBarClick(params);
                                        }
                                    }
                                }}
                            />
                        ) : selectedCity ? (
                            <div style={{ 
                                height: '400px', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                fontSize: '18px',
                                color: '#999'
                            }}>
                                暂无「{selectedCity}」的团队数据
                            </div>
                        ) : null}
                    </div>

                    {/* 团队士气排名区域 */}
                    <div style={{ 
                        flex: '0 0 auto',
                        minHeight: '200px',
                        maxHeight: windowWidth <= 768 ? '300px' : '250px',
                        height: windowWidth <= 768 ? '300px' : 'calc(100% - 500px - 16px)' // 响应式高度
                    }}>
                        {selectedCity && cityTeams.length > 0 && <TeamRanking />}
                    </div>
                </div>

                {/* 右侧区域：团队雷达图分析 */}
                <div style={{ 
                    width: windowWidth <= 768 ? '100%' : 'calc(50% - 12px)',
                    backgroundColor: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                    minWidth: windowWidth <= 768 ? '100%' : '300px',
                    minHeight: windowWidth <= 768 ? '500px' : 'auto' // 小屏幕时设置最小高度
                }}>
                    {selectedTeam ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* 雷达图区域 - 占据70%高度 */}
                            <div style={{ 
                                flex: '0 0 70%', 
                                minHeight: windowWidth <= 768 ? '300px' : '250px' // 响应式高度
                            }}>
                                <ReactECharts
                                    option={getRadarOption(data.teamScores.find(team => 
                                        team.销售团队 === selectedTeam && team.城市 === selectedCity
                                    )!)}
                                    style={{ height: '100%', width: '100%' }}
                                />
                            </div>
                            
                            {/* 团队综合士气评分显示 - 占据30%高度 */}
                            <div style={{ flex: '0 0 30%' }}>
                                {(() => {
                                    const teamData = data.teamScores.find(team => 
                                        team.销售团队 === selectedTeam && team.城市 === selectedCity
                                    );
                                    
                                    if (teamData) {
                                        // 根据评分设置不同的颜色
                                        let scoreColor;
                                        const score = teamData.团队士气综合得分;
                                        if (score >= 9) {
                                            scoreColor = 'rgba(138, 43, 226, 0.9)'; // 紫色 - 高分
                                        } else if (score >= 7) {
                                            scoreColor = 'rgba(65, 105, 225, 0.9)'; // 蓝色 - 中高分
                                        } else if (score >= 6) {
                                            scoreColor = 'rgba(233, 201, 44, 0.9)'; // 绿色 - 中分
                                        } else {
                                            scoreColor = 'rgba(220, 20, 60, 0.9)'; // 红色 - 低分
                                        }
                                        
                                        return (
                                            <div style={{
                                                marginTop: '10px',
                                                textAlign: 'center',
                                                padding: '10px',
                                                borderTop: '1px solid #f0f0f0',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '16px', marginBottom: '5px' }}>
                                                        团队综合士气评分
                                                    </div>
                                                    <div style={{
                                                        fontSize: '24px',
                                                        fontWeight: 'bold',
                                                        color: scoreColor
                                                    }}>
                                                        {teamData.团队士气综合得分.toFixed(2)}
                                                    </div>
                                                </div>
                                                
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    justifyContent: 'space-around',
                                                    marginTop: '10px',
                                                    fontSize: '13px',
                                                    color: '#666'
                                                }}>
                                                    <div style={{ 
                                                        width: windowWidth <= 768 ? '50%' : '33%', 
                                                        marginBottom: '5px' 
                                                    }}>
                                                        <div>主动掌控对话节奏</div>
                                                        <div style={{ fontWeight: 'bold' }}>{teamData.主动掌控对话节奏.toFixed(2)}</div>
                                                    </div>
                                                    <div style={{ 
                                                        width: windowWidth <= 768 ? '50%' : '33%', 
                                                        marginBottom: '5px' 
                                                    }}>
                                                        <div>异议应对韧性</div>
                                                        <div style={{ fontWeight: 'bold' }}>{teamData.异议应对韧性.toFixed(2)}</div>
                                                    </div>
                                                    <div style={{ 
                                                        width: windowWidth <= 768 ? '50%' : '33%', 
                                                        marginBottom: '5px' 
                                                    }}>
                                                        <div>决策推进与闭环</div>
                                                        <div style={{ fontWeight: 'bold' }}>{teamData.决策推进与闭环.toFixed(2)}</div>
                                                    </div>
                                                    <div style={{ 
                                                        width: windowWidth <= 768 ? '50%' : '33%', 
                                                        marginBottom: '5px' 
                                                    }}>
                                                        <div>量化价值呈现</div>
                                                        <div style={{ fontWeight: 'bold' }}>{teamData.量化价值呈现.toFixed(2)}</div>
                                                    </div>
                                                    <div style={{ 
                                                        width: windowWidth <= 768 ? '50%' : '33%', 
                                                        marginBottom: '5px' 
                                                    }}>
                                                        <div>灵活应变能力</div>
                                                        <div style={{ fontWeight: 'bold' }}>{teamData.灵活应变能力.toFixed(2)}</div>
                                                    </div>
                                                    <div style={{ 
                                                        width: windowWidth <= 768 ? '50%' : '33%', 
                                                        marginBottom: '5px' 
                                                    }}>
                                                        <div>情绪感染力</div>
                                                        <div style={{ fontWeight: 'bold' }}>{teamData.情绪感染力.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                                
                                                {/* 看看销售按钮 */}
                                                <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                                                    <button 
                                                        onClick={() => navigate(`/sales?city=${selectedCity}&team=${selectedTeam}`)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: '#1890ff',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            boxShadow: '0 2px 0 rgba(0,0,0,0.045)'
                                                        }}
                                                    >
                                                        看看销售
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                        <div style={{ 
                                            height: '100%', 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            alignItems: 'center',
                                            fontSize: '16px',
                                            color: '#999'
                                        }}>
                                            请从左侧选择一个团队查看详细分析
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div style={{ 
                            height: '100%', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            fontSize: '16px',
                            color: '#999'
                        }}>
                            请从左侧选择一个团队查看详细分析
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamAnalysis; 