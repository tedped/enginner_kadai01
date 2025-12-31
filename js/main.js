//エレベーターの初期状態
const state = {
  currentFloor: 1,
  moving: false,
  door: "closed",
  direction: "idle", // 'up' | 'down' | 'idle'
  queue: [],
};

const elevator = document.querySelector("#elevator");

// ここを変えるだけで階数変更可能
const FLOOR_COUNT = 6;

// ボタンを入れる親要素
const buttonsContainer = document.querySelector("#buttons");
// エレベーターの高さ（単位はpx）
const FLOOR_HEIGHT = 30;
//エレベーターの移動速度（単位はms）
const TIME_PER_FLOOR = {
  normal: 250,
  fast: 150,
};

//エレベーターの階数を推移させる関数
const moveOneFloor = async (nextFloor) => {
  state.moving = true;
  closeDoor();

  //エレベーターの状態遷移が完了してから移動開始するための待機時間
  await wait(5);

  const distance = Math.abs(state.currentFloor - nextFloor);
  const duration = distance * TIME_PER_FLOOR.normal;

  elevator.style.transition = ` bottom ${duration}ms linear`;
  elevator.style.bottom = `${(nextFloor - 1) * FLOOR_HEIGHT}px`;

  await wait(duration);

  state.currentFloor = nextFloor;
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

const renderButtons = () => {
  document.querySelectorAll("button").forEach((btn) => {
    const floor = Number(btn.dataset.floor);
    btn.classList.toggle("waiting", state.queue.includes(floor));
  });
};

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

//現在の進行方向に基づき、次の階を返す関数
const getNextFloor = () => {
  if (state.direction === "up") {
    return state.currentFloor + 1;
  }
  if (state.direction === "down") {
    return state.currentFloor - 1;
  }
  return null;
};

//キューに蓄積されたリクエストが実行中か判定し、処理ループが同時に複数起動しないようにするための制御フラグ
//すでにリクエストされている階を重複してリクエストすることのないようにする
let processing = false;

//エレベーターの移動を処理する関数
//制御
const processQueue = async () => {
  if (processing) return;
  processing = true;

  while (state.queue.length > 0) {
    // direction は最初だけ決める
    if (state.direction === "idle") {
      const target = state.queue[0];
      state.direction = decideDirection(state.currentFloor, target);
    }

    const next = getNextFloor();
    if (next == null) break;

    await moveOneFloor(next);

    //現在の階がキューに含まれていれば乗降処理を行う
    if (state.queue.includes(state.currentFloor)) {
      // 移動前にキューから削除、重複防止
      state.queue = state.queue.filter((f) => f !== state.currentFloor);
      renderButtons(); //キューから削除されたボタンの表示を更新

      await moveOneFloor(next);
      await wait(700);
      openDoor();
      await wait(2000);
      closeDoor();
      await wait(700);
    }

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
buttonsContainer.innerHTML = "";
// ボタンを自動生成
for (let i = FLOOR_COUNT; i >= 1; i--) {
  // 上から下に並べる場合
  const btn = document.createElement("button");
  btn.textContent = `${i}`;
  btn.dataset.floor = i;
  buttonsContainer.appendChild(btn);
  shaftHeight = FLOOR_COUNT * FLOOR_HEIGHT;
  document.querySelector(".shaft").style.height = `${shaftHeight}px`;

  //エレベーターのボタンを押したら、押したボタンの階数を数値としてaddRequestに渡し、キューを実行
  btn.addEventListener("click", () => {
    addRequest(i); //記録
    renderButtons(); //キューに記録されたボタンの表示を更新
    processQueue(); //制御を実行
  });
}
