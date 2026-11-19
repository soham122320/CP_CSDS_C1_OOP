#pragma once
#include "core/Types.hpp"
namespace rescue {
class Facility {
protected:
  int id_, cell_;
  std::string name_;

public:
  Facility(int id, int cell, std::string name) : id_(id), cell_(cell), name_(std::move(name)) {}
  virtual ~Facility() = default;
  int id() const { return id_; }
  int cell() const { return cell_; }
  virtual json state() const = 0;
};

} // namespace rescue
