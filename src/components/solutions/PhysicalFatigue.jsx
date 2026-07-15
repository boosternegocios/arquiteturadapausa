import React, { useState } from 'react'
import { Plus } from 'lucide-react'

export const PhysicalFatigue = ({ data, onChange }) => {
  
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // 01: Atividades Diárias
  const renderAct01 = () => {
    const list = data?.act01?.list || [ { category: 'Trabalho', act: '', rest: '' }, { category: 'Casa', act: '', rest: '' }, { category: 'Outras', act: '', rest: '' } ]
    
    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. Atividades diárias mais cansativas</h3>
        <p className="text-slate-500 font-medium mb-8">
          Ficar muitas horas sentado ou de pé, carregar peso ou repetir movimentos muitas vezes ao dia pode estar sobrecarregando o seu corpo. Você já parou para pensar em compensações para essa sobrecarga?<br />
          Liste as 3 atividades que mais cansam seu corpo e como restaurá-lo após cada uma.
        </p>
        
        <div className="flex flex-col gap-6">
          {list.map((item, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="w-full md:w-48 shrink-0">
                <span className="text-xs font-black uppercase text-[#eb6496] tracking-widest">{item.category}</span>
              </div>
              <div className="flex-1 w-full space-y-3">
                <input 
                  type="text" 
                  placeholder="O que te cansa?" 
                  value={item.act}
                  onChange={(e) => {
                    const newList = [...list]; newList[index].act = e.target.value;
                    updateData('act01', 'list', newList)
                  }}
                  className="w-full bg-white p-4 rounded-xl border border-slate-200 outline-none focus:border-[#1ed7a4] text-sm text-slate-700" 
                />
                <input 
                  type="text" 
                  placeholder="Como restaurar?" 
                  value={item.rest}
                  onChange={(e) => {
                    const newList = [...list]; newList[index].rest = e.target.value;
                    updateData('act01', 'list', newList)
                  }}
                  className="w-full bg-white p-4 rounded-xl border border-slate-200 outline-none focus:border-[#1ed7a4] text-sm text-slate-700 font-medium" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 02: Avaliação de Tensão Muscular
  const renderAct02 = () => {
    const muscles = ['Cabeça', 'Pescoço', 'Costas', 'Braços', 'Pernas', 'Mãos', 'Pés']
    const states = ['Relaxado', 'Tenso', 'Sensível', 'Dolorido']
    const records = data?.act02?.records || muscles.reduce((acc, m) => ({...acc, [m]: { state: '', why: '' }}), {})

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in" style={{animationDelay: '100ms'}}>
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">02. Mapa de tensão muscular</h3>
        <p className="text-slate-500 font-medium mb-8">Onde o estresse é acumulado no seu corpo devido ao esforço físico diário?</p>

        <div className="overflow-x-auto pb-4">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b-2 border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-tl-2xl">Músculo</th>
                {states.map(s => <th key={s} className="p-4 border-b-2 border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest text-center bg-slate-50">{s}</th>)}
                <th className="p-4 border-b-2 border-slate-100 text-xs font-black text-[#eb6496] uppercase tracking-widest bg-slate-50 rounded-tr-2xl w-1/3">Por quê?</th>
              </tr>
            </thead>
            <tbody>
              {muscles.map((m, idx) => (
                <tr key={m} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                  <td className="p-4 font-bold text-slate-700">{m}</td>
                  {states.map(s => (
                    <td key={s} className="p-4 text-center">
                      <div className="inline-flex relative">
                        <input 
                          type="radio" 
                          name={`muscle-${m}`}
                          checked={records[m]?.state === s}
                          onChange={() => {
                            const newRecs = {...records, [m]: { ...records[m], state: s }}; 
                            updateData('act02', 'records', newRecs)
                          }}
                          className="w-5 h-5 accent-[#1ed7a4] cursor-pointer" 
                        />
                      </div>
                    </td>
                  ))}
                  <td className="p-2">
                    <input 
                      type="text" 
                      placeholder="Motivo..."
                      value={records[m]?.why || ''}
                      onChange={(e) => {
                        const newRecs = {...records, [m]: { ...records[m], why: e.target.value }}; 
                        updateData('act02', 'records', newRecs)
                      }}
                      className="w-full bg-transparent p-3 rounded-xl border border-transparent group-hover:bg-white group-hover:border-slate-200 outline-none focus:bg-white focus:border-[#1ed7a4] text-sm transition-all" 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // 03: Equilíbrio entre Cansaço e Descanso
  const renderAct03 = () => {
    const defaultList = ['', '', '', '', '']
    const tiresome = data?.act03?.tiresome || [...defaultList]
    const resting = data?.act03?.resting || [...defaultList]

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in" style={{animationDelay: '200ms'}}>
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">03. Cansaço vs Descanso</h3>
        <p className="text-slate-500 font-medium mb-8">Suas horas de descanso são proporcionais ao seu esforço? Liste até 5 atividades para cada.</p>
        
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Lado Cansaço */}
          <div className="flex-1">
            <h4 className="text-sm font-black uppercase text-[#eb6496] tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#eb6496]"></span> Atividades que cansam
            </h4>
            <div className="flex flex-col gap-5">
              {[0,1,2,3,4].map(i => (
                <input 
                  key={`tire-${i}`}
                  type="text" 
                  value={tiresome[i]}
                  placeholder={`${i+1}.`}
                  onChange={(e) => {
                    const n = [...tiresome]; n[i] = e.target.value;
                    updateData('act03', 'tiresome', n)
                  }}
                  className="w-full bg-slate-50/80 p-4 rounded-xl border border-transparent outline-none focus:border-[#eb6496]/50 focus:bg-white transition-all text-sm font-medium text-slate-700" 
                />
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center -mx-4 z-10 w-8">
            <div className="h-full w-px bg-slate-100 absolute"></div>
            <div className="bg-white p-2 text-slate-300 font-bold text-xs ring-4 ring-white rounded-full">VS</div>
          </div>

          {/* Lado Descanso */}
          <div className="flex-1">
            <h4 className="text-sm font-black uppercase text-[#1ed7a4] tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1ed7a4]"></span> Atividades de descanso
            </h4>
            <div className="flex flex-col gap-5">
              {[0,1,2,3,4].map(i => (
                <input 
                  key={`rest-${i}`}
                  type="text" 
                  value={resting[i]}
                  placeholder={`${i+1}.`}
                  onChange={(e) => {
                    const n = [...resting]; n[i] = e.target.value;
                    updateData('act03', 'resting', n)
                  }}
                  className="w-full bg-slate-50/80 p-4 rounded-xl border border-transparent outline-none focus:border-[#1ed7a4]/50 focus:bg-white transition-all text-sm font-medium text-slate-700" 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 04: Otimização de Ambiente
  const renderAct04 = () => {
    const list = [
      { key: 'temp', label: 'Temperatura do quarto' },
      { key: 'dark', label: 'Nível de escuridão' },
      { key: 'cafeina', label: 'Gestão da Cafeína' },
      { key: 'silencio', label: 'Nível de silêncio' },
      { key: 'sons', label: 'Uso de sons relaxantes' },
      { key: 'aromas', label: 'Uso de aromas ou tecidos confortáveis' },
      { key: 'cama', label: 'Qualidade do colchão e travesseiro' },
    ]
    const envData = data?.act04 || {}

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in" style={{animationDelay: '300ms'}}>
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">03. Higiene do sono - Otimização</h3>
        <p className="text-slate-500 font-medium mb-10">Avalie de 1 a 10 como está a otimização do seu ambiente de sono em cada um destes aspectos:</p>
        
        <div className="space-y-6">
          {list.map((item, index) => (
            <div key={item.key} className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
              <h4 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#1ed7a4]/20 text-[#004b4c] flex items-center justify-center shrink-0">{index+1}</span>
                {item.label}
              </h4>
              <div className="flex justify-between md:justify-start gap-2 md:gap-3 flex-wrap pl-0 md:pl-11">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                  const isSelected = envData[item.key] === val
                  let colorClass = 'border-slate-200 text-slate-400 hover:bg-slate-100 bg-white'
                  
                  if (isSelected) {
                    if (val < 5) colorClass = 'bg-[#eb6496] text-white border-[#eb6496] font-bold shadow-[0_0_15px_rgba(235,100,150,0.4)]'
                    else if (val === 5) colorClass = 'bg-slate-900 text-white border-slate-900 font-bold shadow-[0_0_15px_rgba(15,23,42,0.4)]'
                    else colorClass = 'bg-[#1ed7a4] text-slate-900 border-[#1ed7a4] font-black shadow-[0_0_15px_rgba(30,215,164,0.4)]'
                  }

                  return (
                    <button
                      key={val}
                      onClick={() => updateData('act04', item.key, val)}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border flex items-center justify-center text-sm md:text-base transition-all ${colorClass} ${isSelected ? 'scale-110' : ''}`}
                    >
                      {val}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 05: Diário de Sono (5 dias)
  const renderAct05 = () => {
    const defaultDays = Array(5).fill({ hours: '', events: '', dreams: '' }).map((_, i) => ({ day: i+1, hours: '', events: '', dreams: '' }))
    const daysLog = data?.act05?.days || defaultDays

    return (
      <div className="mb-16 bg-gradient-to-br from-[#004b4c] to-slate-900 p-8 md:p-10 rounded-[3rem] shadow-xl text-white animate-in fade-in relative overflow-hidden" style={{animationDelay: '400ms'}}>
        {/* Glow decoration */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#eb6496] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#1ed7a4] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-white mb-2 font-display">05. Diário de Higiene do Sono</h3>
          <p className="text-[#1ed7a4] font-medium mb-8">Avaliação dos padrões de sono por um período de cinco dias para identificar áreas de melhoria. Use este formulário diariamente.</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#1ed7a4] border-b border-white/10">Dia</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#1ed7a4] border-b border-white/10">Horas de Sono</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#1ed7a4] border-b border-white/10 w-1/3">Eventos Noturnos (Acordar, Celular)</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#1ed7a4] border-b border-white/10 w-1/3">Sonhos / Qualidade</th>
                </tr>
              </thead>
              <tbody>
                {daysLog.map((d, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4"><div className="w-8 h-8 rounded-full bg-white/10 font-bold text-center leading-8 text-[13px]">{d.day}</div></td>
                    <td className="p-2">
                      <input 
                        type="text" placeholder="Ex: 6h" value={d.hours}
                        onChange={(e) => { const n = [...daysLog]; n[index].hours = e.target.value; updateData('act05', 'days', n) }}
                        className="w-full bg-transparent p-3 rounded-xl border border-transparent focus:bg-white/10 outline-none focus:border-white/20 text-sm" 
                      />
                    </td>
                    <td className="p-2">
                       <input 
                        type="text" placeholder="..." value={d.events}
                        onChange={(e) => { const n = [...daysLog]; n[index].events = e.target.value; updateData('act05', 'days', n) }}
                        className="w-full bg-transparent p-3 rounded-xl border border-transparent focus:bg-white/10 outline-none focus:border-white/20 text-sm" 
                      />
                    </td>
                    <td className="p-2">
                       <input 
                        type="text" placeholder="..." value={d.dreams}
                        onChange={(e) => { const n = [...daysLog]; n[index].dreams = e.target.value; updateData('act05', 'days', n) }}
                        className="w-full bg-transparent p-3 rounded-xl border border-transparent focus:bg-white/10 outline-none focus:border-white/20 text-sm" 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">Recuperação Física</h2>
        <p className="text-lg text-slate-500 font-medium">Se você obteve alto índice de cansaço físico, essa auto reflexão pode ajudá-lo a melhorar esse aspecto.</p>
      </div>

      {renderAct01()}
      {renderAct02()}
      {/* Ocultado temporariamente a pedido: renderAct03() */}
      {renderAct04()}
    </div>
  )
}
