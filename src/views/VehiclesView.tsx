import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  Search,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Vehicle, Block, Apartment, Resident, AccessLog } from '../types';

export const VehiclesView: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<Vehicle | null>(null);

  // New vehicle form state
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState<Vehicle['type']>('carro');
  const [ownerName, setOwnerName] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [parkingSpace, setParkingSpace] = useState('Vaga Subsolo 1');
  const [notes, setNotes] = useState('');

  const refreshData = () => {
    setVehicles(storage.getVehicles());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
    setAccessLogs(storage.getAccessLogs());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.parkingSpace.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || v.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !model || !ownerName) {
      alert('Placa, modelo e proprietário são obrigatórios.');
      return;
    }

    const hostResident = residents.find((r) => r.apartmentId === selectedAptId && r.isMainResident) || residents.find((r) => r.apartmentId === selectedAptId);

    const newVeh: Vehicle = {
      id: `veh-${Date.now()}`,
      plate: plate.toUpperCase().trim(),
      brand,
      model,
      color,
      type,
      ownerName,
      residentId: hostResident?.id,
      apartmentId: selectedAptId,
      blockId: selectedBlockId,
      parkingSpace: parkingSpace || 'Vaga Padrão',
      status: 'ativo',
      notes,
    };

    storage.saveVehicle(newVeh);
    setShowAddModal(false);
    setPlate('');
    setBrand('');
    setModel('');
    setColor('');
    setOwnerName('');
    setNotes('');
  };

  // Movement history for selected vehicle
  const vehicleHistory = selectedVehicleForHistory
    ? accessLogs.filter((l) => l.vehiclePlate?.toUpperCase() === selectedVehicleForHistory.plate.toUpperCase())
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Veículos</h2>
          </div>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/80 border border-sky-700/60 text-sky-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-sky-400" />
            <span>Modo Observador</span>
          </div>
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Veículo</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar veículos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono-tabular"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">Todos os Tipos de Veículo</option>
          <option value="carro">Carros</option>
          <option value="moto">Motos</option>
          <option value="van">Vans / Utilitários</option>
          <option value="caminhao">Caminhões de Carga</option>
          <option value="bicicleta">Bicicletas / Patinetes</option>
        </select>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((v) => {
          const aptNum = v.apartmentId.replace('apt-', '').toUpperCase();
          const block = blocks.find((b) => b.id === v.blockId);

          return (
            <div
              key={v.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-extrabold text-white bg-slate-950 border border-slate-700 px-2.5 py-1 rounded shadow-inner tracking-wider">
                      {v.plate}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white text-xs leading-tight">
                        {v.brand} {v.model}
                      </h4>
                      <span className="text-[10px] text-slate-400">{v.color} · <span className="capitalize">{v.type}</span></span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded">
                    Apt {aptNum}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  <p>Proprietário: <strong className="text-slate-200">{v.ownerName}</strong></p>
                  <p>Vaga Vinculada: <span className="text-slate-300 font-medium">{v.parkingSpace}</span></p>
                  <p>Torre: <span className="text-slate-300">{block?.name || 'Torre A'}</span></p>
                  {v.notes && <p className="text-[10px] text-slate-500">{v.notes}</p>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cadastrado Ativo</span>
                </span>

                <button
                  onClick={() => setSelectedVehicleForHistory(v)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                >
                  Histórico de Movimento
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vehicle Movement History Modal */}
      {selectedVehicleForHistory && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Histórico de Movimentação · Placa {selectedVehicleForHistory.plate}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedVehicleForHistory.brand} {selectedVehicleForHistory.model} · {selectedVehicleForHistory.ownerName}
                </p>
              </div>
              <button
                onClick={() => setSelectedVehicleForHistory(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2 text-xs">
              {vehicleHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma entrada ou saída registrada para esta placa nos registros recentes.
                </div>
              ) : (
                vehicleHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono-tabular"
                  >
                    <div>
                      <span className="font-semibold text-white block">{item.purpose}</span>
                      <span className="text-[10px] text-slate-400">Operador: {item.operatorName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-200 block">Entrada: {item.entryTime}</span>
                      <span className="text-[10px] text-slate-400">
                        {item.exitTime ? `Saída: ${item.exitTime}` : 'Atualmente Dentro'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                onClick={() => setSelectedVehicleForHistory(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVehicle}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Cadastrar Novo Veículo</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Placa (Mercosul ou Padrão) *</label>
                  <input
                    type="text"
                    required
                    placeholder="BRA2E19 ou ABC-1234"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Veículo *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="carro">Carro de Passeio</option>
                    <option value="moto">Motocicleta</option>
                    <option value="van">Van / Utilitário</option>
                    <option value="caminhao">Caminhão</option>
                    <option value="bicicleta">Bicicleta / Patinete</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Toyota, Jeep, Honda..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Corolla, Renegade..."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cor</label>
                  <input
                    type="text"
                    placeholder="Prata, Preto..."
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Proprietário / Condutor *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do proprietário"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apartamento Vinculado</label>
                  <select
                    value={selectedAptId}
                    onChange={(e) => setSelectedAptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    {apartments
                      .filter((a) => !selectedBlockId || a.blockId === selectedBlockId)
                      .map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          Apt {apt.number}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Identificação da Vaga</label>
                <input
                  type="text"
                  placeholder="Ex: Vaga 12 (Subsolo 1)"
                  value={parkingSpace}
                  onChange={(e) => setParkingSpace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observações (TAG Eletrônica, etc.)</label>
                <input
                  type="text"
                  placeholder="Ex: TAG nº 4401 ativa"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Salvar Veículo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
