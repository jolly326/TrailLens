import LazyLottie from '../components/LazyLottie';
import { squirrelRunningAnimation } from '../lib/animations';
import { asset } from '../lib/asset';

/** 行程解析中的过渡页（纯展示，无业务状态） */
export default function AnalyzingView() {
  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: `url(${asset('img/简笔画森林.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <style>
        {`
          @keyframes progressMove {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes squirrelMove {
            0% { left: 0px; }
            100% { left: calc(100% - 96px); }
          }
          .text-container {
            position: relative;
            height: 28px;
            width: 100%;
            text-align: center;
            margin-bottom: 24px;
          }
          .text-item {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            opacity: 0;
            font-size: 20px;
            font-weight: bold;
            color: white;
          }
          .text-1 {
            animation: show 0s 0s forwards, hide 0s 1s forwards;
          }
          .text-2 {
            animation: show 0s 1s forwards, hide 0s 2s forwards;
          }
          .text-3 {
            animation: show 0s 2s forwards;
          }
          @keyframes show {
            to { opacity: 1; }
          }
          @keyframes hide {
            to { opacity: 0; }
          }
          @keyframes count {
            0% { content: "0%"; }
            10% { content: "10%"; }
            20% { content: "20%"; }
            30% { content: "30%"; }
            40% { content: "40%"; }
            50% { content: "50%"; }
            60% { content: "60%"; }
            70% { content: "70%"; }
            80% { content: "80%"; }
            90% { content: "90%"; }
            100% { content: "100%"; }
          }
          .progress-number::after {
            content: "0%";
            animation: count 3s linear forwards;
            font-size: 24px;
            font-weight: bold;
            color: white;
          }
        `}
      </style>
      <div className="w-[80%] max-w-md h-20 relative mb-12">
        <div className="absolute bottom-0 left-0 w-full h-3 bg-slate-700 rounded-full"></div>
        <div
          className="absolute bottom-0 left-0 h-3 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
          style={{ animation: 'progressMove 3s linear forwards' }}
        ></div>
        <div
          className="absolute bottom-[-30px] z-10"
          style={{ animation: 'squirrelMove 3s linear forwards' }}
        >
          <LazyLottie
            src={squirrelRunningAnimation}
            style={{ width: '96px', height: '96px' }}
            loop={true}
            autoplay={true}
            renderer="svg"
          />
        </div>
      </div>
      <div className="text-container">
        <p className="text-item text-1">轨迹分析中...</p>
        <p className="text-item text-2">高光识别中...</p>
        <p className="text-item text-3">Vlog生成中...</p>
      </div>
      <div className="progress-number"></div>
    </div>
  );
}
