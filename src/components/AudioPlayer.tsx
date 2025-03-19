import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'antd';
import { CaretRightOutlined, PauseOutlined, SoundOutlined } from '@ant-design/icons';

interface AudioPlayerProps {
  audioSrc: string;
  buttonText?: {
    play: string;
    pause: string;
  };
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioSrc,
  buttonText = { play: '听听录音', pause: '暂停录音' }
}) => {
  // 音频播放相关状态
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('0:00');
  const [duration, setDuration] = useState<string>('0:00');
  const [volume, setVolume] = useState<number>(100);
  const [showVolumeControl, setShowVolumeControl] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // 播放音频的函数
  const playAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.volume = volume / 100;
      
      // 添加事件监听器
      audioRef.current.addEventListener('timeupdate', updateProgress);
      audioRef.current.addEventListener('ended', resetAudio);
      audioRef.current.addEventListener('error', handleAudioError);
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(formatTime(audioRef.current.duration));
        }
      });
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          if (audioRef.current) {
            setDuration(formatTime(audioRef.current.duration));
          }
        })
        .catch(handleAudioError);
    }
  };
  
  // 更新进度条
  const updateProgress = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
      setCurrentTime(formatTime(audioRef.current.currentTime));
    }
  };
  
  // 重置音频
  const resetAudio = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setCurrentTime('0:00');
  };
  
  // 处理音频错误
  const handleAudioError = (error: any) => {
    console.error('播放音频失败:', error);
    alert('播放音频失败，请检查音频文件是否存在。');
    resetAudio();
  };
  
  // 设置音频进度
  const setAudioTime = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const progressBar = e.currentTarget;
      const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
      const progressBarWidth = progressBar.clientWidth;
      const percentage = clickPosition / progressBarWidth;
      
      audioRef.current.currentTime = percentage * audioRef.current.duration;
      setAudioProgress(percentage * 100);
    }
  };

  // 调整音量
  const adjustVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };
  
  // 切换音量控制显示
  const toggleVolumeControl = () => {
    setShowVolumeControl(!showVolumeControl);
  };

  // 组件卸载时清理音频资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateProgress);
        audioRef.current.removeEventListener('ended', resetAudio);
        audioRef.current.removeEventListener('error', handleAudioError);
        audioRef.current.removeEventListener('loadedmetadata', () => {});
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 当音频源变化时重置音频状态
  useEffect(() => {
    resetAudio();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, [audioSrc]);

  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto 10px' }}>
        <div 
          style={{ 
            width: '100%', 
            height: '6px', 
            backgroundColor: '#f0f0f0',
            borderRadius: '3px',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={setAudioTime}
        >
          <div 
            style={{ 
              width: `${audioProgress}%`, 
              height: '100%', 
              backgroundColor: '#1890ff',
              borderRadius: '3px',
              transition: 'width 0.1s'
            }}
          />
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '12px', 
          color: '#999',
          marginTop: '4px'
        }}>
          <span>{currentTime}</span>
          <span>{duration}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <Button 
          type="primary" 
          onClick={playAudio}
          icon={isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
        >
          {isPlaying ? buttonText.pause : buttonText.play}
        </Button>
        <Button 
          icon={<SoundOutlined />} 
          onClick={toggleVolumeControl}
        />
      </div>
      {showVolumeControl && (
        <div style={{ 
          marginTop: '10px', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <SoundOutlined style={{ fontSize: '14px', color: '#999' }} />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={adjustVolume}
            style={{ width: '100px' }}
          />
          <span style={{ fontSize: '12px', color: '#999' }}>{volume}%</span>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer; 