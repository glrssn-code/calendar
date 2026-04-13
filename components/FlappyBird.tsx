'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Bird {
  x: number;
  y: number;
  vy: number;
  rotation: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

const GRAVITY = 0.35;
const FLAP_STRENGTH = -6;
const PIPE_WIDTH = 50;
const PIPE_GAP = 220;
const PIPE_SPEED = 2.2; // 速度提升10%

interface FlappyBirdProps {
  onExit: () => void;
}

const HIGH_SCORE_KEY = 'flappy_bird_high_score';

// 从 localStorage 加载最高分
const loadHighScore = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
};

// 保存最高分到 localStorage
const saveHighScore = (score: number) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HIGH_SCORE_KEY, score.toString());
  } catch {
    // 忽略存储错误
  }
};

export function FlappyBird({ onExit }: FlappyBirdProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'dead' | 'waiting'>('waiting');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(loadHighScore);
  const birdRef = useRef<Bird>({ x: 0, y: 200, vy: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(score);
  const onExitRef = useRef(onExit);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const BIRD_X_REF = useRef(0);
  onExitRef.current = onExit;

  // 计算小鸟 X 位置
  const getBirdX = useCallback(() => {
    return canvasSizeRef.current.width / 3;
  }, []);

  // 重置游戏
  const resetGame = useCallback(() => {
    const birdX = getBirdX();
    birdRef.current = { x: birdX, y: 200, vy: 0, rotation: 0 };
    BIRD_X_REF.current = birdX;
    pipesRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setGameState('waiting');
    gameStateRef.current = 'waiting';
  }, [getBirdX]);

  // 开始游戏
  const startGame = useCallback(() => {
    if (gameStateRef.current === 'dead') {
      resetGame();
    }
    setGameState('playing');
    gameStateRef.current = 'playing';
    birdRef.current.vy = FLAP_STRENGTH;
  }, [resetGame]);

  // 退出游戏
  const exitGame = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onExitRef.current();
  }, []);

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitGame();
      } else if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && gameStateRef.current !== 'dead') {
        e.preventDefault();
        if (gameStateRef.current === 'waiting') {
          startGame();
        }
        birdRef.current.vy = FLAP_STRENGTH;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame, exitGame]);

  // 游戏循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvasSizeRef.current = { width: canvas.width, height: canvas.height };
      const birdX = canvas.width / 3;
      BIRD_X_REF.current = birdX;
      // 如果是等待状态，更新小鸟位置
      if (gameStateRef.current === 'waiting') {
        birdRef.current.x = birdX;
      }
    };
    resizeCanvas();

    const animate = () => {
      const bird = birdRef.current;
      const pipes = pipesRef.current;

      // 清空画布
      ctx.fillStyle = '#87CEEB'; // 天蓝色背景
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制地面
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, canvas.height - 50, canvas.width, 10);

      // 游戏进行中
      if (gameStateRef.current === 'playing') {
        // 重力
        bird.vy += GRAVITY;
        bird.y += bird.vy;

        // 旋转角度
        bird.rotation = Math.min(Math.max(bird.vy * 3, -30), 90);

        // 边界检测
        if (bird.y > canvas.height - 60 || bird.y < 0) {
          setGameState('dead');
          gameStateRef.current = 'dead';
          if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            saveHighScore(scoreRef.current);
          }
        }

        // 生成管道
        if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 300) {
          pipes.push({
            x: canvas.width,
            topHeight: 100 + Math.random() * (canvas.height - 300 - PIPE_GAP),
            passed: false,
          });
        }

        // 移动管道
        pipes.forEach((pipe) => {
          pipe.x -= PIPE_SPEED;

          // 碰撞检测
          if (
            bird.x + 20 > pipe.x &&
            bird.x - 20 < pipe.x + PIPE_WIDTH &&
            (bird.y - 20 < pipe.topHeight || bird.y + 20 > pipe.topHeight + PIPE_GAP)
          ) {
            setGameState('dead');
            gameStateRef.current = 'dead';
            if (scoreRef.current > highScore) {
              setHighScore(scoreRef.current);
              saveHighScore(scoreRef.current);
            }
          }

          // 计分
          if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        });

        // 移除离开屏幕的管道
        pipesRef.current = pipes.filter((pipe) => pipe.x > -PIPE_WIDTH);
      }

      // 绘制管道
      pipes.forEach((pipe) => {
        // 上管道
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);

        // 下管道
        ctx.fillStyle = '#32CD32';
        const bottomY = pipe.topHeight + PIPE_GAP;
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, canvas.height - bottomY - 50);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 20);
      });

      // 绘制小鸟
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate((bird.rotation * Math.PI) / 180);

      // 身体
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // 翅膀
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      if (gameStateRef.current === 'playing' || bird.vy < 0) {
        ctx.ellipse(-5, -5, 15, 10, -0.3, 0, Math.PI * 2);
      } else {
        ctx.ellipse(-5, 5, 15, 10, 0.3, 0, Math.PI * 2);
      }
      ctx.fill();

      // 眼睛
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(10, -5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(12, -5, 4, 0, Math.PI * 2);
      ctx.fill();

      // 喙
      ctx.fillStyle = '#FF6347';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(35, 5);
      ctx.lineTo(20, 10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 绘制分数
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText(scoreRef.current.toString(), canvas.width / 2, 70);
      ctx.fillText(scoreRef.current.toString(), canvas.width / 2, 70);

      // 等待开始状态
      if (gameStateRef.current === 'waiting') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.fillText('点击屏幕或按空格开始', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '24px Arial';
        ctx.fillText('按 ESC 或点击退出按钮退出', canvas.width / 2, canvas.height / 2);
      }

      // 死亡状态
      if (gameStateRef.current === 'dead') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 80);

        ctx.font = 'bold 36px Arial';
        ctx.fillText(`得分: ${scoreRef.current}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`最高分: ${Math.max(scoreRef.current, highScore)}`, canvas.width / 2, canvas.height / 2 + 30);

        ctx.font = '24px Arial';
        ctx.fillText('点击屏幕重新开始', canvas.width / 2, canvas.height / 2 + 90);
        ctx.fillText('按 ESC 或点击退出按钮退出', canvas.width / 2, canvas.height / 2 + 130);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [highScore]);

  // 点击事件处理
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 检查是否点击了右上角的退出按钮区域
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 退出按钮区域 (右上角)
      if (x >= canvas.width - 90 && x <= canvas.width - 10 && y >= 10 && y <= 50) {
        exitGame();
        return;
      }
    }

    if (gameStateRef.current === 'dead') {
      resetGame();
      setGameState('waiting');
      gameStateRef.current = 'waiting';
    } else if (gameStateRef.current === 'waiting') {
      startGame();
    } else {
      birdRef.current.vy = FLAP_STRENGTH;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      />
      {/* 退出按钮 */}
      <button
        onClick={exitGame}
        className="absolute top-3 right-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transition-colors cursor-pointer"
        style={{ zIndex: 60 }}
      >
        退出
      </button>
      {/* 左上角提示 */}
      <div className="absolute top-4 left-4 text-white text-sm opacity-70">
        空格/上/右 飞行
      </div>
    </div>
  );
}
