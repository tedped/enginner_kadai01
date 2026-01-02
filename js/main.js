//エレベーターの初期状態

// ここを変えるだけで台数を増減可能
const ELEVATOR_COUNT = 3;
// ここを変えるだけで階数を増減可能
const FLOOR_COUNT = 10;
// エレベーターの高さ（単位はpx）
const FLOOR_HEIGHT = 30;
//エレベーターの移動速度（単位はms）
const TIME_PER_FLOOR = {
  normal: 250,
  fast: 150,
};

// エレベーターを入れる親要素
const elevatorsContainer = document.querySelector("#elevators");
const elevators = [];
// ボタンを入れる親要素
const buttonsContainer = document.querySelector("#buttons");

elevatorsContainer.textContent = "";
// 各エレベーターのDOMとstateを生成
for (let i = 0; i < ELEVATOR_COUNT; i++) {
  const shaftEl = document.createElement("div");
  shaftEl.classList.add("shaft");

  const elevatorEl = document.createElement("div");
  elevatorEl.classList.add("elevator");
  elevatorEl.style.bottom = "0px";

  const leftDoor = document.createElement("div");
  leftDoor.className = "door left";

  const rightDoor = document.createElement("div");
  rightDoor.className = "door right";

  const hi = document.createElement("div");
  hi.textContent = "🥸";
  hi.id = "hi";

  elevatorEl.append(leftDoor, rightDoor, hi);

  shaftEl.appendChild(elevatorEl);
  elevatorsContainer.appendChild(shaftEl);

  //エレベーターの状態を管理するオブジェクトを配列に追加
  elevators.push({
    id: i,
    currentFloor: 1,
    moving: false,
    direction: "idle",
    queue: [],
    element: elevatorEl,
    processing: false,
    door: "closed",
  });
}

const shaftHeight = FLOOR_COUNT * FLOOR_HEIGHT;
document.querySelectorAll(".shaft").forEach((shaft) => {
  shaft.style.height = `${shaftHeight}px`;
});

//移動距離の最も小さい、最適なエレベーターを選択する関数
const selectElevator = (floor) => {
  let best = elevators[0];
  let bestDistance = Infinity;

  for (const e of elevators) {
    const distance = Math.abs(e.currentFloor - floor);
    if (!e.moving && distance < bestDistance) {
      best = e;
      bestDistance = distance;
    }
  }
  return best;
};

//エレベーターの階数を推移させる関数
const moveOneFloor = async (elevatorState, nextFloor) => {
  elevatorState.moving = true;
  closeDoor(elevatorState);

  //エレベーターの状態遷移が完了してから移動開始するための待機時間
  await wait(15);

  const distance = Math.abs(elevatorState.currentFloor - nextFloor);
  const duration = distance * TIME_PER_FLOOR.normal;

  elevatorState.element.style.transition = ` bottom ${duration}ms linear`;
  elevatorState.element.style.bottom = `${(nextFloor - 1) * FLOOR_HEIGHT}px`;

  await wait(duration);

  elevatorState.currentFloor = nextFloor;
  elevatorState.moving = false;
};

//エレベーターのドア状態を「閉」から「開」に遷移させるための関数
const openDoor = async (elevatorState) => {
  if (elevatorState.door === "open") return;

  elevatorState.door = "open";
  elevatorState.element.classList.add("door-open");

  await wait(2000);

  closeDoor(elevatorState);
};

//エレベーターのドア状態を「開」から「閉」に遷移させるための関数
const closeDoor = (elevatorState) => {
  if (elevatorState.door === "closed") return;

  elevatorState.door = "closed";
  elevatorState.element.classList.remove("door-open");
};

//エレベーターの状態遷移に時間がかかることを表現するための関数
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//処理されていないボタン操作をリクエストとしてキューに追加する関数
//記録
const addRequest = (floor) => {
  const e = selectElevator(floor); //最適なエレベーターを選択

  // 今いる階を押した場合
  if (e.currentFloor === floor && !e.moving) {
    if (e.door === "closed") {
      openDoor(e);
    }
    return;
  }

  if (!e.queue.includes(floor)) {
    e.queue.push(floor);
  }
};

//キューに追加されたリクエストに基づき、ボタンの点灯表示状態を更新する関数
const renderButtons = () => {
  document.querySelectorAll("button").forEach((btn) => {
    const floor = Number(btn.dataset.floor);
    btn.classList.toggle(
      "waiting",
      selectElevator(floor).queue.includes(floor)
    );
  });
};

//エレベーターの移動方向を決定する関数
const decideDirection = (from, to) => {
  if (to > from) return "up";
  if (to < from) return "down";
  return "idle";
};

//現在の進行方向に基づき、次の階を返す関数
const getNextFloor = (elevatorState) => {
  if (elevatorState.direction === "up") {
    return elevatorState.currentFloor + 1;
  }
  if (elevatorState.direction === "down") {
    return elevatorState.currentFloor - 1;
  }
  return null;
};

//キューに蓄積されたリクエストが実行中か判定し、処理ループが同時に複数起動しないようにするための制御フラグ
//すでにリクエストされている階を重複してリクエストすることのないようにする
let processing = false;

//エレベーターの移動を処理する関数
//制御
const processElevatorQueue = async (elevatorState) => {
  if (elevatorState.processing) return;
  elevatorState.processing = true;

  while (elevatorState.queue.length > 0) {
    // direction は最初だけ決める
    if (elevatorState.direction === "idle") {
      const target = elevatorState.queue[0];
      elevatorState.direction = decideDirection(
        elevatorState.currentFloor,
        target
      );
    }

    const next = getNextFloor(elevatorState);
    if (next == null) break;

    await moveOneFloor(elevatorState, next);

    //現在の階がキューに含まれていれば乗降処理を行う
    if (elevatorState.queue.includes(elevatorState.currentFloor)) {
      // 移動前にキューから削除、重複防止
      elevatorState.queue = elevatorState.queue.filter(
        (f) => f !== elevatorState.currentFloor
      );
      renderButtons(); //キューから削除されたボタンの、点灯表示を更新

      await moveOneFloor(elevatorState, next);
      await wait(700);
      openDoor(elevatorState);
      await wait(2000);
      closeDoor(elevatorState);
      await wait(700);
    }

    //進行方向にリクエストがまだあるか確認
    const hasSameDirectionTarget =
      elevatorState.direction === "up"
        ? //some: 配列の中で条件を満たす要素が一つでもあればtrueを返す
          elevatorState.queue.some((f) => f > elevatorState.currentFloor)
        : elevatorState.queue.some((f) => f < elevatorState.currentFloor);

    // 進行方向にリクエストするキューがない場合、状態をidleにする
    if (!hasSameDirectionTarget) {
      elevatorState.direction = "idle";
    }
  }

  elevatorState.processing = false;
};

buttonsContainer.textContent = "";
// ボタンを自動生成
for (let i = FLOOR_COUNT; i >= 1; i--) {
  // 上から下に並べる
  const btn = document.createElement("button");
  btn.textContent = `${i}`;
  btn.dataset.floor = i;
  buttonsContainer.appendChild(btn);

  //エレベーターのボタンを押したら、押したボタンの階数を数値としてaddRequestに渡し、キューを実行
  btn.addEventListener("click", () => {
    const e = selectElevator(i); //最適なエレベーターを選択
    addRequest(i); //選択したエレベーターをキューに記録
    renderButtons(); //キューに記録されたボタンの、点灯表示を更新
    processElevatorQueue(e); //制御を実行
  });
}
