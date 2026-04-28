import React from 'react'

export const CreativeFatigue = ({ data, onChange }) => {
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // 01: Contemplando a Beleza
  const renderAct01 = () => {
    const list = data?.act01?.list || ['', '', '', '']

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. Contemplando a Beleza</h3>
        <p className="text-slate-500 font-medium mb-8">A vida se torna mais agradável pela beleza que encontramos. Registre as belezas e pequenos detalhes do seu ambiente que você normalmente deixaria passar.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((item, i) => (
            <div key={`beauty-${i}`} className="flex gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#eb6496]/10 text-[#eb6496] font-bold flex items-center justify-center rounded-xl">{i+1}</div>
              <input 
                type="text" 
                placeholder="Exaustão à inspiração: Descreva a beleza..."
                value={item}
                onChange={(e) => {
                  const n = [...list]; n[i] = e.target.value; updateData('act01', 'list', n)
                }}
                className="w-full bg-[#fcfaf5] p-3 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-[#eb6496] transition-colors text-sm text-slate-700" 
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 02: Estilo de vida Sabático
  const renderAct02 = () => {
    const periods = [
      { key: 'weekly', label: 'Restauração Semanal', desc: 'Sua rotina sagrada de uma ou mais horas na semana' },
      { key: 'monthly', label: 'Restauração Mensal', desc: 'Um dia ou final de semana focado no reabastecimento' },
      { key: 'yearly', label: 'Momento Sabático Anual', desc: 'Dias ou semanas intencionais de descanso profundo' }
    ]

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in" style={{animationDelay: '100ms'}}>
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">02. Estilo de Vida Sabático</h3>
        <p className="text-slate-500 font-medium mb-8">Olhe para seu calendário e programe períodos de reabastecimento para os quais você nunca tem tempo.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {periods.map((p, index) => (
            <div key={p.key} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col group hover:bg-[#1ed7a4]/5 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1ed7a4] mb-2 border-b-2 border-[#1ed7a4] inline-block pb-1 w-max">Frequência</span>
              <h4 className="font-bold text-slate-800 text-lg mb-1">{p.label}</h4>
              <p className="text-slate-500 text-xs font-medium mb-4">{p.desc}</p>
              <textarea 
                placeholder="Declare suas intenções para este período..."
                value={data?.act02?.[p.key] || ''}
                onChange={(e) => updateData('act02', p.key, e.target.value)}
                className="w-full flex-1 min-h-[120px] bg-white p-4 rounded-xl border border-slate-200 outline-none focus:border-[#1ed7a4] transition-colors text-sm text-slate-700 resize-none font-medium placeholder:font-normal mt-auto" 
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">Solução de Cansaço Criativo</h2>
        <p className="text-lg text-slate-500 font-medium">Você obteve um alto índice de cansaço no pilar Criativo. Estas ferramentas vão restaurar seu fascínio e energia.</p>
      </div>

      {renderAct01()}
      {renderAct02()}
    </div>
  )
}
