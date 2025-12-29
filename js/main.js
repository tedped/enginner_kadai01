//エレベーターの初期状態
const state = {
  currentFloor: 1,
  moving: false,
  door: "closed",
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
  openDoor();

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

//エレベーターのボタンを押したら、押したボタンの階数を数値としてmoveToに渡す
document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    moveTo(Number(btn.dataset.floor));
  });
});
