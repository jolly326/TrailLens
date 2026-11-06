import { useState } from 'react';
import { ChevronLeft, Star } from 'lucide-react';
import LazyLottie from '../components/LazyLottie';
import { editAnimation, sandyLoadingAnimation } from '../lib/animations';
import { asset } from '../lib/asset';

export interface AITemplateViewProps {
  setVlogSubView: (view: 'highlight' | 'aiTemplate') => void;
  /** 返回行程总结页 */
  onBack: () => void;
}

/** AI 剪辑模板选择与预览页 */
export default function AITemplateView({ setVlogSubView, onBack }: AITemplateViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [generating, setIsGenerating] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  const videoMap: { [key: number]: { src: string; title: string } } = {
    1: { src: '/vlog.mp4', title: '户外纪实风 - 徒步山林' },
    2: { src: asset('img/692b8ebbe4978de3df987e7baf10362c(1)_raw.mp4'), title: '快剪卡点风 - 动感瞬间' },
    3: { src: asset('img/2d39a9d496e9922b6dbdb686a6c89853.mp4'), title: '文艺叙事风 - 静谧时光' }
  };

  const aiTemplates = [
    { id: 1, name: '户外纪实风', desc: '还原徒步真实场景，突出自然音效与环境氛围，适合记录原始行程', cover: 'https://picsum.photos/300/200?category=nature&random=10', color: 'from-emerald-400 to-teal-500' },
    { id: 2, name: '快剪卡点风', desc: '搭配动感BGM，快速切换高光画面，适合社交平台分享', cover: 'https://picsum.photos/300/200?category=nature&random=11', color: 'from-orange-400 to-red-500' },
    { id: 3, name: '文艺叙事风', desc: '慢镜头+温柔旁白，讲述徒步中的心情故事，适合个人记录与感悟分享', cover: 'https://picsum.photos/300/200?category=nature&random=12', color: 'from-purple-400 to-pink-500' }
  ];

  const handleGenerate = () => {
    if (!selectedTemplate) return alert('请先选择一个模板！');
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const video = videoMap[selectedTemplate];
      setVideoSrc(video.src);
      setVideoTitle(video.title);
      setShowVideo(true);
    }, 2000);
  };

  const handleBackToTemplates = () => {
    setShowVideo(false);
    setVideoSrc('');
    setVideoTitle('');
  };

  if (generating) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <div className="w-32 h-32 mb-6">
          <LazyLottie src={sandyLoadingAnimation} loop={true} autoplay={true} style={{ width: '100%', height: '100%' }} />
        </div>
        <p className="text-white text-lg font-medium animate-pulse">AI 正在剪辑你的高光时刻...</p>
        <p className="text-slate-400 text-sm mt-2">请稍等，马上就好~</p>
      </div>
    );
  }

  if (showVideo && videoSrc) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-900 text-white">
        <div className="p-4 pt-8 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
          <button onClick={handleBackToTemplates} className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
            <ChevronLeft size={20} />
            <span>返回模板</span>
          </button>
          <h2 className="text-xl font-bold">AI 剪辑预览</h2>
          <div className="w-8"></div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-black/40 rounded-2xl overflow-hidden shadow-2xl">
            <video src={videoSrc} controls autoPlay className="w-full" poster="https://picsum.photos/800/450?nature">
              您的浏览器不支持 video 标签。
            </video>
            <div className="p-4 bg-slate-800/60">
              <h3 className="text-lg font-bold text-white">{videoTitle}</h3>
              <p className="text-sm text-slate-400 mt-1">AI 根据您的行程自动生成，可分享至社交平台。</p>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-emerald-500 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">分享视频</button>
                <button className="px-4 py-2 bg-blue-500/20 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors">保存本地</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-white relative">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1/1/1')] opacity-5 mix-blend-overlay pointer-events-none" />
      <div className="p-4 pt-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
          <ChevronLeft size={20} />
          <span>返回</span>
        </button>
        <h2 className="text-xl font-bold">AI 自动剪辑模板</h2>
        <button onClick={() => setVlogSubView('highlight')} className="flex items-center gap-1 text-amber-400 text-sm">
          <Star size={16} /> 高光时刻
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-slate-200">选择剪辑模板</h3>
        <div className="space-y-6">
          {aiTemplates.map((template) => (
            <div
              key={template.id}
              className={`rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                selectedTemplate === template.id
                  ? `border-${template.color.split('-')[1]}-500 bg-gradient-to-r ${template.color}/10 shadow-lg shadow-${template.color.split('-')[1]}-500/20`
                  : 'border-slate-700 hover:border-slate-500 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-black/20'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="relative h-40 overflow-hidden">
                <img src={template.cover} alt={template.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${template.color} text-white shadow-lg`}>
                    {template.name}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-800/60 backdrop-blur-sm">
                <h4 className="text-xl font-bold text-white mb-2">{template.name}</h4>
                <p className="text-slate-400 text-sm">{template.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <button
          onClick={handleGenerate}
          disabled={!selectedTemplate}
          className={`w-full py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 ${
            selectedTemplate
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/30 active:scale-98 animate-pulse'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          <LazyLottie src={editAnimation} loop={true} autoplay={true} style={{ width: 24, height: 24 }} />
          开始AI剪辑
        </button>
      </div>
    </div>
  );
}
