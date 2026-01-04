this.onIdle();

// BuildingController に登録
elevator.onIdle = () => {
  building.assignRequests();
};
