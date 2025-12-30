//エレベーターの初期状態
const state = {
  currentFloor: 1,
  moving: false,
  door: "closed",
  direction: "idle", // 'up' | 'down' | 'idle'
  queue: [],
};

const elevator = document.querySelector("#elevator");

// エレベーターの高さ（単位はpx,現在は5階建て、シャフトは300px）
const FLOOR_HEIGHT = 60;

//エレベーターの移動速度（単位はms）
const TIME_PER_FLOOR = {
  normal: 800,
  fast: 400,
};

//エレベーターの階数を変化させる関数
const moveTo = async (floor) => {
  if (state.moving) return;

  state.moving = true;
  closeDoor();

  //closeDoorの状態遷移が完了してからエレベーターが移動開始するための待機時間
  await wait(500);

  const distance = Math.abs(state.currentFloor - floor);
  const duration = distance * TIME_PER_FLOOR.normal;

  elevator.style.transition = ` bottom ${duration}ms linear`;
  elevator.style.bottom = `${(floor - 1) * FLOOR_HEIGHT}px`;

  await wait(duration);

  state.currentFloor = floor;
  state.moving = false;
};

//エレベーターのドア状態を「閉」から「開」に遷移させるための関数
const openDoor = () => {
  elevator.classList.add("door-open");
};

//エレベーターのドア状態を「開」から「閉」に遷移させるための関数
const closeDoor = () => {
  elevator.classList.remove("door-open");
};

//エレベーターの状態遷移に時間がかかることを表現するための関数
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//処理されていないボタン操作をリクエストとしてキューに追加する関数
//記録
const addRequest = (floor) => {
  if (!state.queue.includes(floor)) {
    state.queue.push(floor);
  }
};

//エレベーターの移動方向を決定する関数
const decideDirection = (from, to) => {
  if (to > from) return "up";
  if (to < from) return "down";
  return "idle";
};

//現在のリクエストと進行方向に基づき、移動方向に最も近い階を選択して返す関数
const getNextFloor = () => {
  if (state.queue.length === 0) return null;

  //上方向へ移動中は、現在地から上方向のリクエストを対象に、最も近い階を選択して返す
  if (state.direction === "up") {
    const ups = state.queue.filter((f) => f > state.currentFloor);
    if (ups.length > 0) {
      return Math.min(...ups);
    }
  }

  //下方向へ移動中は、現在地から下方向のリクエストを対象に、最も近い階を選択して返す
  if (state.direction === "down") {
    const downs = state.queue.filter((f) => f < state.currentFloor);
    if (downs.length > 0) {
      return Math.max(...downs);
    }
  }

  // idle または該当なし → 最初のリクエスト
  return state.queue[0];
};

//キューに蓄積されたリクエストが実行中か判定し、処理ループが同時に複数起動しないようにするための制御フラグ
//すでにリクエストされている階を重複してリクエストすることのないようにする
let processing = false;

//キューに追加された順に数値をmoveToに渡し、エレベーターの移動をリクエスト順に処理する関数
//制御
const processQueue = async () => {
  if (processing) return;
  processing = true;

  while (state.queue.length > 0) {
    const next = getNextFloor();
    if (next == null) break;

    // direction は最初だけ決める
    if (state.direction === "idle") {
      state.direction = decideDirection(state.currentFloor, next);
    }

    // 移動前にキューから削除、重複防止
    state.queue = state.queue.filter((f) => f !== next);

    await moveTo(next);
    openDoor();
    await wait(500);
    closeDoor();

    //進行方向にリクエストがまだあるか確認
    const hasSameDirectionTarget =
      state.direction === "up"
        ? //some: 配列の中で条件を満たす要素が一つでもあればtrueを返す
          state.queue.some((f) => f > state.currentFloor)
        : state.queue.some((f) => f < state.currentFloor);

    // 進行方向にリクエストするキューがない場合、状態をidleにする
    if (!hasSameDirectionTarget) {
      state.direction = "idle";
    }
  }

  processing = false;
};

//エレベーターのボタンを押したら、押したボタンの階数を数値としてaddRequestに渡し、キューを実行
document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    addRequest(Number(btn.dataset.floor)); //記録
    processQueue(); //制御を実行
  });
});
