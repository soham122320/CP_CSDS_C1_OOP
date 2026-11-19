#pragma once
#include "facilities/Facility.hpp"
namespace rescue {
class FireStation : public Facility {
public:
  FireStation(int id, int c, std::string n) : Facility(id, c, std::move(n)) {}
  json state() const override;
};

} // namespace rescue
