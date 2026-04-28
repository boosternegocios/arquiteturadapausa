import React from 'react'

export const SensorialFatigue = ({ data, onChange }) => {
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // 01: Sobrecarga Sensorial
  const renderAct01 = () => {
    const senses = ['Visão', 'Audição', 'Tato', 'Paladar', 'Olfato']
    const records = data?.act01?.records || senses.reduce((acc, s) => ({...acc, [s]: { estimulo: '', melhorar: '' }}), {})

    return (
      <div className="mb-16 bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">01. Sobrecarga Sensorial</h3>
        <p className="text-slate-500 font-medium mb-8">Quais dos seus sentidos sofrem mais estímulos diariamente e podem estar sobrecarregados?</p>

        <div className="overflow-x-auto pb-4">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b-2 border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-tl-2xl">Sentido</th>
                <th className="p-4 border-b-2 border-slate-100 text-xs font-black text-[#eb6496] uppercase tracking-widest bg-slate-50 w-2/5">Estímulo que gera sobrecarga</th>
                <th className="p-4 border-b-2 border-slate-100 text-xs font-black text-[#1ed7a4] uppercase tracking-widest bg-slate-50 rounded-tr-2xl w-2/5">Como melhorar?</th>
              </tr>
            </thead>
            <tbody>
              {senses.map((s) => (
                <tr key={s} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                  <td className="p-4 font-bold text-slate-700">{s}</td>
                  <td className="p-2">
                     <textarea 
                      placeholder="Ex: Telas, Luzes fortes..."
                      value={records[s]?.estimulo || ''}
                      onChange={(e) => {
                        const newRecs = {...records, [s]: { ...records[s], estimulo: e.target.value }}; 
                        updateData('act01', 'records', newRecs)
                      }}
                      className="w-full bg-transparent p-3 rounded-xl border border-transparent group-hover:bg-white group-hover:border-slate-200 outline-none focus:bg-white focus:border-[#eb6496] text-sm transition-all resize-none h-[60px]" 
                    />
                  </td>
                  <td className="p-2">
                    <textarea 
                      placeholder="Ex: Modo escuro, Óculos..."
                      value={records[s]?.melhorar || ''}
                      onChange={(e) => {
                        const newRecs = {...records, [s]: { ...records[s], melhorar: e.target.value }}; 
                        updateData('act01', 'records', newRecs)
                      }}
                      className="w-full bg-transparent p-3 rounded-xl border border-transparent group-hover:bg-white group-hover:border-slate-200 outline-none focus:bg-white focus:border-[#1ed7a4] text-sm transition-all resize-none h-[60px]" 
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

  // 02: Recarregue a bateria (Escala 1 a 10)
  const renderAct02 = () => {
    const questions = [
      { key: 'desconectar', label: 'Se desconectar do celular por uma hora, um período ou um dia' },
      { key: 'brilho', label: 'Ajustar o brilho das telas do seu celular e computador' },
      { key: 'silenciar', label: 'Silenciar alertas e notificações de emails e mensagens' },
      { key: 'silencio', label: 'Passar alguns minutos em silêncio absoluto' },
      { key: 'frutas', label: 'Consumir frutas e vegetais em seu estado natural (Paladar/Olfato)' },
      { key: 'olhos', label: 'Fechar os olhos algumas vezes ao dia (Visão)' },
      { key: 'tampaos', label: 'Usar tampões de ouvido em locais barulhentos (Audição)' }
    ]

    const scaleData = data?.act02 || {}

    return (
      <div className="mb-16 bg-[#004b4c] text-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in" style={{animationDelay: '100ms'}}>
        <h3 className="text-2xl font-black text-white mb-2 font-display">02. Recarregue sua Bateria Sensorial</h3>
        <p className="text-[#1ed7a4] font-medium mb-10">Em uma escala de 1 a 10, quanto você priorizaria a implementação dos seguintes aspectos na sua rotina?</p>
        
        <div className="space-y-10">
          {questions.map((q, index) => (
            <div key={q.key} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#1ed7a4]/20 text-[#1ed7a4] flex items-center justify-center shrink-0">{index+1}</span>
                {q.label}
              </h4>
              <div className="flex justify-between md:justify-start gap-2 md:gap-3 flex-wrap pl-0 md:pl-11">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                  const isSelected = scaleData[q.key] === val
                  let colorClass = 'border-white/20 text-white/60 hover:bg-white/10 bg-transparent'
                  
                  if (isSelected) {
                    if (val <= 3) colorClass = 'bg-[#eb6496] text-white border-[#eb6496] font-bold shadow-[0_0_15px_rgba(235,100,150,0.5)]'
                    else if (val <= 7) colorClass = 'bg-amber-400 text-slate-900 border-amber-400 font-bold shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                    else colorClass = 'bg-[#1ed7a4] text-slate-900 border-[#1ed7a4] font-black shadow-[0_0_15px_rgba(30,215,164,0.5)]'
                  }

                  return (
                    <button
                      key={val}
                      onClick={() => updateData('act02', q.key, val)}
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

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">Solução de Cansaço Sensorial</h2>
        <p className="text-lg text-slate-500 font-medium">Você obteve um alto índice de cansaço no pilar Sensorial. Identifique seus ofensores e proteja seu corpo de hiperestímulos.</p>
      </div>

      {renderAct01()}
      {renderAct02()}
    </div>
  )
}
