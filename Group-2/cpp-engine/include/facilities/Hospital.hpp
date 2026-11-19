#pragma once
#include "facilities/Facility.hpp"
namespace rescue {
class Hospital : public Facility {
public:
  int capacity = 4, occupied = 0, reserved = 0;
  Hospital(int id, int c, std::string n) : Facility(id, c, std::move(n)) {}
  bool available() const { return occupied + reserved < capacity; }
  json state() const override;
};

} // namespace rescue
