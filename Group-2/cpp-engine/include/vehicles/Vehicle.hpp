#pragma once
#include "core/Types.hpp"
namespace rescue {
class Vehicle {
protected:
  int id_;
  std::string type_;

public:
  int cell, fuel = 100, supplies = 5, civilian = -1, hospital = -1;
  std::string status = "available";
  std::vector<int> route;
  int routeIndex = 0;
  Vehicle(int id, int cell, std::string type) : id_(id), type_(std::move(type)), cell(cell) {}
  virtual ~Vehicle() = default;
  virtual int fuelCost() const { return 1; }
  virtual int rewardBonus() const { return 0; }
  int id() const { return id_; }
  json state() const;
};
class Ambulance : public Vehicle {
public:
  Ambulance(int id, int c) : Vehicle(id, c, "Ambulance") {}
  int rewardBonus() const override { return 25; }
};
class RescueVan : public Vehicle {
public:
  RescueVan(int id, int c) : Vehicle(id, c, "Rescue van") {}
};
class FireTruck : public Vehicle {
public:
  FireTruck(int id, int c) : Vehicle(id, c, "Fire truck") {}
};
class Helicopter : public Vehicle {
public:
  Helicopter(int id, int c) : Vehicle(id, c, "Helicopter") {}
  int fuelCost() const override { return 2; }
};

} // namespace rescue
