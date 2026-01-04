import { BuildingController } from "./buildingController.js";

// // elevators はあなたが既に作っている state 配列
// const building = new BuildingController({
//   elevators,
//   floorCount: FLOOR_COUNT,
// });

// // 外ボタン（例）
// upButton.addEventListener("click", () => {
//   building.requestFromOutside({
//     floor: 5,
//     direction: "up",
//   });
// });

//エレベーターの初期状態

// ここを変えるだけで台数を増減可能
const ELEVATOR_COUNT = 5;
// ここを変えるだけで階数を増減可能
const FLOOR_COUNT = 26;
// エレベーターの高さ（単位はpx）
const FLOOR_HEIGHT = 42.2;
//エレベーターの移動速度（単位はms）
const TIME_PER_FLOOR = {
  normal: 250,
  fast: 150,
};

// エレベーターを入れる親要素
const elevatorsContainer = document.querySelector("#elevators");
const elevators = [];
// ボタンを入れる親要素
// const buttonsContainer = document.querySelector("#buttons");

// 外ボタンを生成
const externalContainer = document.querySelector("#external-buttons");
const externalRequests = [];
externalContainer.textContent = "";

for (let f = FLOOR_COUNT; f >= 1; f--) {
  const row = document.createElement("div");
  row.className = "external-floor";

  const label = document.createElement("div");
  label.textContent = f;

  const upBtn = document.createElement("button");
  upBtn.textContent = "⬆️";
  upBtn.disabled = f === FLOOR_COUNT;

  const downBtn = document.createElement("button");
  downBtn.textContent = "⬇️";
  downBtn.disabled = f === 1;

  row.append(label, upBtn, downBtn);
  externalContainer.appendChild(row);
}

// 各エレベーターのDOMとstate及び内ボタンパネルを生成
elevatorsContainer.textContent = "";
for (let i = 0; i < ELEVATOR_COUNT; i++) {
  const shaftEl = document.createElement("div");
  shaftEl.classList.add("shaft");

  const elevatorEl = document.createElement("div");
  elevatorEl.classList.add("elevator");
  elevatorEl.style.bottom = "0px";

  const panel = document.createElement("div");
  panel.classList.add("panel");

  for (let f = FLOOR_COUNT; f >= 1; f--) {
    const btn = document.createElement("button");
    btn.textContent = f;
    btn.dataset.floor = f;

    btn.addEventListener("click", async () => {
      const e = elevators[i]; //選択したエレベーターの状態オブジェクトを取得
      await addRequest(e, f); //選択したエレベーターをキューに記録
      renderInnerButtons(e, e.panel); //キューに記録されたボタンの、点灯表示を更新
      processElevatorQueue(e); //制御を実行
    });

    panel.appendChild(btn);
  }

  const leftDoor = document.createElement("div");
  leftDoor.className = "door left";

  const rightDoor = document.createElement("div");
  rightDoor.className = "door right";

  const hi = document.createElement("div");
  hi.textContent = "🥸";
  hi.className = "hi";

  const elevatorSet = document.createElement("div");
  elevatorSet.className = "elevator-set";

  elevatorEl.append(leftDoor, rightDoor, hi);
  shaftEl.append(elevatorEl);
  elevatorSet.append(shaftEl, panel);
  elevatorsContainer.append(elevatorSet);

  //エレベーターの状態を管理するオブジェクトを配列に追加
  elevators.push({
    id: i,
    currentFloor: 1,
    moving: false,
    direction: "idle",
    queue: [],
    element: elevatorEl,
    processing: false, //キューに蓄積されたリクエストが実行中か判定し、処理ループが同時に複数起動しないようにするための制御フラグ
    door: "closed",
    doorBusy: false,
    panel,
  });
}

//エレベーターシャフトの高さを設定
const shaftHeight = FLOOR_COUNT * FLOOR_HEIGHT;
document.querySelectorAll(".shaft").forEach((shaft) => {
  shaft.style.height = `${shaftHeight}px`;
});

//移動距離の最も小さい、最適なエレベーターを選択する関数
// const selectElevator = (floor) => {
//   let best = elevators[0];
//   let bestDistance = Infinity;

//   for (const e of elevators) {
//     const distance = Math.abs(e.currentFloor - floor);
//     if (!e.moving && distance < bestDistance) {
//       best = e;
//       bestDistance = distance;
//     }
//   }
//   return best;
// };

//エレベーターの状態遷移に時間がかかることを表現するための関数
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//エレベーターのドア状態を「閉」から「開」に遷移させるための関数
const openAndCloseDoor = async (elevatorState) => {
  if (elevatorState.doorBusy) return;
  elevatorState.doorBusy = true;

  elevatorState.door = "open";
  elevatorState.element.classList.add("door-open");

  await wait(2000);

  elevatorState.element.classList.remove("door-open");
  elevatorState.door = "closed";

  await wait(700);

  elevatorState.doorBusy = false;
};

//エレベーターの階数を推移させる関数
const moveOneFloor = async (elevatorState, nextFloor) => {
  elevatorState.moving = true;

  const distance = Math.abs(elevatorState.currentFloor - nextFloor);
  const duration = distance * TIME_PER_FLOOR.normal;

  elevatorState.element.style.transition = ` bottom ${duration}ms linear`;
  elevatorState.element.style.bottom = `${(nextFloor - 1) * FLOOR_HEIGHT}px`;

  await wait(duration);

  elevatorState.currentFloor = nextFloor;
  elevatorState.moving = false;
};

//処理されていないボタン操作をリクエストとしてキューに追加する関数
//記録
const addRequest = async (e, floor) => {
  // 今いる階を押した場合
  if (e.currentFloor === floor && !e.moving) {
    if (e.door === "closed") {
      await openAndCloseDoor(e);
    }
    return;
  }

  if (!e.queue.includes(floor)) {
    e.queue.push(floor);
  }
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

//キューに追加されたリクエストに基づき、ボタンの点灯表示状態を更新する関数
const renderInnerButtons = (elevatorState, panelEl) => {
  panelEl.querySelectorAll("button").forEach((btn) => {
    const floor = Number(btn.dataset.floor);
    btn.classList.toggle("waiting", elevatorState.queue.includes(floor));
  });
};

//エレベーターの移動を処理する関数
//制御
const processElevatorQueue = async (elevatorState) => {
  if (elevatorState.processing) return;
  elevatorState.processing = true;

  //ドアが完全に閉まるまで待つ
  while (elevatorState.queue.length > 0) {
    while (elevatorState.doorBusy || elevatorState.door === "open") {
      await wait(50);
    }

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

    buildingController.pickupOutsideRequests(elevatorState);

    //現在の階がキューに含まれていれば乗降処理を行う
    if (elevatorState.queue.includes(elevatorState.currentFloor)) {
      // 移動前にキューから削除、重複防止
      elevatorState.queue = elevatorState.queue.filter(
        (f) => f !== elevatorState.currentFloor
      );
      renderInnerButtons(elevatorState, elevatorState.panel); //キューから削除されたボタンの、点灯表示を更新

      await openAndCloseDoor(elevatorState);
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

// buttonsContainer.textContent = "";
// ボタンを自動生成
// for (let i = FLOOR_COUNT; i >= 1; i--) {
//   // 上から下に並べる
//   // const btn = document.createElement("button");
//   // btn.textContent = `${i}`;
//   // btn.dataset.floor = i;
//   // buttonsContainer.appendChild(btn);

//   //エレベーターのボタンを押したら、押したボタンの階数を数値としてaddRequestに渡し、キューを実行
//   btn.addEventListener("click", async () => {
//     const e = selectElevator(i); //最適なエレベーターを選択
//     await addRequest(e, i); //選択したエレベーターをキューに記録
//     renderInnerButtons(e, e.panel); //キューに記録されたボタンの、点灯表示を更新
//     processElevatorQueue(e); //制御を実行
//   });
// }
