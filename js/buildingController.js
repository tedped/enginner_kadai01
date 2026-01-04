// 外ボタンから来る「未処理リクエスト」の例
// outsideRequests = [
//   { floor: 5, direction: "up" },
//   { floor: 12, direction: "down" }
// ];

export class BuildingController {
  constructor({ elevators, floorCount }) {
    // 管理対象
    this.elevators = elevators; // Elevator state の配列
    this.floorCount = floorCount;

    // 外ボタンから来る「未処理リクエスト」の配列
    this.outsideRequests = [];
  }

  /**
   * 外ボタンが押されたときに呼ばれる唯一の入口
   */
  requestFromOutside({ floor, direction }) {
    const request = { floor, direction };

    this.outsideRequests.push(request);

    const elevator = this.selectBestElevator(request);
    if (!elevator) return;

    this.dispatch(elevator, request);
  }

  /**
   * 最適なエレベーターを選ぶ
   */
  selectBestElevator(request) {
    // ① 止まっているエレベーターを優先
    const idle = this.elevators.find((e) => e.direction === "idle");
    if (idle) return idle;

    // ② 全部動いていたら距離が一番近いもの
    let best = null;
    let min = Infinity;

    for (const e of this.elevators) {
      if (e.direction !== request.direction) continue;

      const distance = Math.abs(e.currentFloor - request.floor);
      if (distance < min) {
        min = distance;
        best = e;
      }
    }
    return best;
  }

  pickupOutsideRequests(elevator) {
    const current = elevator.currentFloor;

    const pickups = this.outsideRequests.filter(
      (r) => r.floor === current && r.direction === elevator.direction
    );

    pickups.forEach((r) => {
      elevator.queue.push(r.floor);
    });

    // 拾ったものは外ボタンのリクエストから削除
    this.outsideRequests = this.outsideRequests.filter(
      (r) => !(r.floor === current && r.direction === elevator.direction)
    );
  }

  // エレベーターが受け入れ可能かどうかを判定
  canAccept(elevator, request) {
    if (elevator.direction === "idle") return true;

    if (elevator.direction !== request.direction) return false;

    if (request.direction === "up") {
      return elevator.currentFloor <= request.floor;
    }

    if (request.direction === "down") {
      return elevator.currentFloor >= request.floor;
    }

    return false;
  }

  // requests があり、idle なエレベーターがあれば割り当てる
  assignRequests() {
    if (this.requests.length === 0) return;

    const idleElevators = this.elevators.filter((e) => e.isIdle);
    if (idleElevators.length === 0) return;

    // リクエストを前方から1つずつ処理
    const request = this.requests.shift();

    let bestElevator = null;
    let bestDistance = Infinity;

    for (const e of idleElevators) {
      const distance = Math.abs(e.currentFloor - request.floor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestElevator = e;
      }
    }

    bestElevator.assign(request);
  }
  // 指定したエレベーターの進行方向にある停止階を取得してリストを返す
  getStopsInDirection(elevator) {
    if (elevator.direction === "up") {
      return elevator.queue
        .filter((f) => f > elevator.currentFloor)
        .sort((a, b) => a - b);
    }

    if (elevator.direction === "down") {
      return elevator.queue
        .filter((f) => f < elevator.currentFloor)
        .sort((a, b) => b - a);
    }

    return [];
  }

  /**
   * エレベーターに命令を出す
   */
  dispatch(elevator, request) {
    // direction はまだ無視
    elevator.queue.push(request.floor);

    // UI更新 & 実行（あなたの既存関数）
    renderInnerButtons(elevator, elevator.panel);
    this.processElevatorQueue(elevator);
  }
  // エレベーターのキューを処理する
  async processElevatorQueue(elevator) {
    if (elevator.processing) return;
    elevator.processing = true;

    while (elevator.queue.length > 0) {
      if (elevator.direction === "idle") {
        const target = elevator.queue[0];
        elevator.direction = target > elevator.currentFloor ? "up" : "down";
      }
      //「次に止まる階」を1つだけ決める
      const stops = this.getStopsInDirection(elevator);
      const nextStop = stops[0];
      if (!nextStop) break;

      await moveToFloor(elevator, nextStop);
      await openAndCloseDoor(elevator);

      // 外ボタンのリクエストを拾う
      this.pickupOutsideRequests(elevator);

      //停止後の後処理を行い、無限ループを防ぐ
      elevator.queue = elevator.queue.filter(
        (f) => f !== elevator.currentFloor
      );
      // 内部ボタンの点灯を更新
      renderInnerButtons(elevator, elevator.panel);

      // 進行方向にまだ停止階がなければ idle に戻す
      const remainingStops = this.getStopsInDirection(elevator);
      if (remainingStops.length === 0) {
        elevator.direction = "idle";
      }
    }

    elevator.processing = false;
  }

  /**
   * デバッグ用
   */
  debugState() {
    return {
      pendingRequests: this.pendingRequests,
      elevators: this.elevators.map((e) => ({
        id: e.id,
        floor: e.currentFloor,
        moving: e.moving,
        queue: [...e.queue],
      })),
    };
  }
}
